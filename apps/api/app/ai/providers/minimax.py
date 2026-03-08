from __future__ import annotations

import base64

import httpx

from app.ai.errors import ProviderInvocationError, TaskInputValidationError
from app.ai.providers.shared import (
    ALLOWED_IMAGE_TYPES,
    MAX_IMAGE_BYTES,
    SYSTEM_PROMPTS,
    validate_data_image_url,
    validate_remote_image_url,
)
from app.ai.schemas import AITaskOutput, AITaskRequest


class MiniMaxAdapter:
    provider_id = "minimax"
    label = "MiniMax"
    supported_task_types = frozenset(
        {"vision-detect", "narrative-summarize", "workflow-assist"}
    )

    def __init__(
        self,
        api_key: str | None,
        api_host: str = "https://api.minimax.io",
        api_base_url: str = "https://api.minimaxi.chat/v1",
        text_model: str = "MiniMax-M1",
        timeout_seconds: float = 30.0,
        vision_timeout_seconds: float = 45.0,
    ) -> None:
        self._api_key = api_key
        self._api_host = api_host.rstrip("/")
        self._api_base_url = api_base_url.rstrip("/")
        self._text_model = text_model
        self._timeout_seconds = timeout_seconds
        self._vision_timeout_seconds = vision_timeout_seconds

    def is_configured(self) -> bool:
        return bool(self._api_key)

    def supports(self, task_type: str) -> bool:
        return task_type in self.supported_task_types

    def run(self, task: AITaskRequest) -> AITaskOutput:
        if task.task_type == "vision-detect":
            return self._invoke_vision_task(task)

        summary = self._invoke_text_task(task)
        warnings = [
            "MiniMax text orchestration is live, but object states still require human approval.",
            "Any publication, valuation, or disposition change must be reviewed before export.",
        ]

        if task.input.attachments:
            warnings.append(
                "The current MiniMax OpenAI-compatible text endpoint does not ingest image/audio/video "
                "attachments; native multimodal endpoints need a separate adapter."
            )

        sections = (
            ["room context", "object highlights", "research gaps"]
            if task.task_type == "narrative-summarize"
            else ["evidence intake", "human review", "export preparation"]
        )

        return AITaskOutput(
            summary=summary,
            structuredData={
                "spaceId": task.input.space_id,
                "roomId": task.input.room_id,
                "attachmentCount": len(task.input.attachments),
                "deliveryMode": "openai-compatible-text",
                "model": self._text_model,
                "sections": sections,
            },
            warnings=warnings,
        )

    def _invoke_vision_task(self, task: AITaskRequest) -> AITaskOutput:
        if not self._api_key:
            raise ProviderInvocationError("MiniMax is not configured.")

        image_source = self._extract_image_source(task)
        image_data_url, image_origin = self._normalize_image_source(image_source)
        payload = {
            "prompt": self._build_vision_prompt(task),
            "image_url": image_data_url,
        }

        try:
            with httpx.Client(timeout=self._vision_timeout_seconds) as client:
                response = client.post(
                    f"{self._api_host}/v1/coding_plan/vlm",
                    headers={
                        "Authorization": f"Bearer {self._api_key}",
                        "Content-Type": "application/json",
                        "MM-API-Source": "Matterport-Platform",
                    },
                    json=payload,
                )
        except httpx.HTTPError as exc:
            raise ProviderInvocationError(
                "MiniMax vision request failed before a response was received."
            ) from exc

        if response.status_code in {401, 403}:
            raise ProviderInvocationError(
                "MiniMax rejected the configured credentials for vision analysis. "
                "Check MINIMAX_API_KEY and MINIMAX_API_HOST / MINIMAX_VISION_API_HOST."
            )

        if response.status_code == 429:
            raise ProviderInvocationError(
                "MiniMax rate-limited the vision request. Retry later or reduce the request volume."
            )

        try:
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise ProviderInvocationError("MiniMax returned an upstream vision error.") from exc

        try:
            payload = response.json()
        except ValueError as exc:
            raise ProviderInvocationError(
                "MiniMax vision response was not valid JSON."
            ) from exc

        self._raise_for_minimax_api_error(payload, response.headers.get("Trace-Id"))

        content = payload.get("content")
        if not isinstance(content, str) or not content.strip():
            raise ProviderInvocationError("MiniMax vision endpoint returned no usable content.")

        warnings = [
            "Vision detections are suggestions only and require human confirmation before any workflow change.",
            "Only the first attached image is analyzed in this version of the platform.",
        ]
        if image_origin == "remote-url":
            warnings.append(
                "Remote images are fetched server-side, normalized to a data URL, and then forwarded to MiniMax."
            )

        return AITaskOutput(
            summary=content.strip(),
            structuredData={
                "spaceId": task.input.space_id,
                "roomId": task.input.room_id,
                "attachmentCount": len(task.input.attachments),
                "deliveryMode": "native-vlm",
                "model": "MiniMax Coding Plan VLM",
                "imageOrigin": image_origin,
            },
            warnings=warnings,
        )

    def _invoke_text_task(self, task: AITaskRequest) -> str:
        if not self._api_key:
            raise ProviderInvocationError("MiniMax is not configured.")

        system_prompt = SYSTEM_PROMPTS[task.task_type]
        user_message = self._build_user_message(task)
        payload = {
            "model": self._text_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "temperature": 0.4,
        }

        try:
            with httpx.Client(timeout=self._timeout_seconds) as client:
                response = client.post(
                    f"{self._api_base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self._api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
        except httpx.HTTPError as exc:
            raise ProviderInvocationError("MiniMax request failed before a response was received.") from exc

        if response.status_code in {401, 403}:
            raise ProviderInvocationError(
                "MiniMax rejected the configured credentials. Check MINIMAX_API_KEY and account access."
            )

        if response.status_code == 429:
            raise ProviderInvocationError(
                "MiniMax rate-limited the request. Retry later or lower the request volume."
            )

        try:
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise ProviderInvocationError("MiniMax returned an upstream error.") from exc

        try:
            content = response.json()["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise ProviderInvocationError(
                "MiniMax response was not in the expected format."
            ) from exc

        normalized = self._normalize_content(content)

        if not normalized:
            raise ProviderInvocationError("MiniMax returned an empty completion.")

        return normalized

    def _build_user_message(self, task: AITaskRequest) -> str:
        return "\n".join(
            [
                f"Task type: {task.task_type}",
                f"Project: {task.input.project_id or 'unknown'}",
                f"Space: {task.input.space_id or 'unknown'}",
                f"Room: {task.input.room_id or 'unknown'}",
                f"Attachment count: {len(task.input.attachments)}",
                f"Prompt: {task.input.prompt}",
            ]
        )

    def _build_vision_prompt(self, task: AITaskRequest) -> str:
        return "\n".join(
            [
                "You are a multimodal collections analyst for an immersive estate and museum platform.",
                "Respond in the same language as the user's prompt.",
                "Identify the most salient objects, likely materials, visible condition clues, and any ambiguities.",
                "Do not estimate price, provenance certainty, or irreversible disposition.",
                "State clearly that human review is required before workflow changes.",
                f"Project: {task.input.project_id or 'unknown'}",
                f"Space: {task.input.space_id or 'unknown'}",
                f"Room: {task.input.room_id or 'unknown'}",
                f"User request: {task.input.prompt}",
            ]
        )

    def _extract_image_source(self, task: AITaskRequest) -> str:
        for attachment in task.input.attachments:
            if attachment.kind == "image" and attachment.url:
                return attachment.url.strip()

        raise TaskInputValidationError(
            "Vision tasks require at least one image attachment as an upload or HTTPS image URL."
        )

    def _normalize_image_source(self, image_source: str) -> tuple[str, str]:
        if image_source.startswith("data:image/"):
            validate_data_image_url(image_source)
            return image_source, "inline-upload"

        if image_source.startswith("https://"):
            return self._download_image_as_data_url(image_source), "remote-url"

        raise TaskInputValidationError(
            "Image attachments must be uploaded images or secure HTTPS image URLs."
        )

    def _download_image_as_data_url(self, image_url: str) -> str:
        validate_remote_image_url(image_url)

        try:
            with httpx.Client(timeout=self._vision_timeout_seconds) as client:
                response = client.get(image_url)
        except httpx.HTTPError as exc:
            raise ProviderInvocationError("The remote image could not be downloaded.") from exc

        if response.status_code >= 400:
            raise ProviderInvocationError("The remote image URL did not return a usable image.")

        content_type = response.headers.get("content-type", "").split(";", 1)[0].lower()
        normalized_content_type = self._normalize_content_type(content_type, image_url)
        if normalized_content_type not in ALLOWED_IMAGE_TYPES:
            raise TaskInputValidationError(
                "Only JPEG, PNG, and WebP image URLs are supported."
            )

        image_bytes = response.content
        if len(image_bytes) > MAX_IMAGE_BYTES:
            raise TaskInputValidationError("Remote images must be 8 MB or smaller.")

        encoded = base64.b64encode(image_bytes).decode("utf-8")
        return f"data:{normalized_content_type};base64,{encoded}"

    def _normalize_content_type(self, content_type: str, image_url: str) -> str:
        if content_type in {"image/jpeg", "image/png", "image/webp"}:
            return content_type

        lowered = image_url.lower()
        if lowered.endswith(".png"):
            return "image/png"
        if lowered.endswith(".webp"):
            return "image/webp"
        if lowered.endswith(".jpg") or lowered.endswith(".jpeg"):
            return "image/jpeg"
        return content_type

    def _raise_for_minimax_api_error(
        self, payload: dict[str, object], trace_id: str | None
    ) -> None:
        base_resp = payload.get("base_resp")
        if not isinstance(base_resp, dict):
            return

        status_code = base_resp.get("status_code")
        if status_code in {0, "0", None}:
            return

        status_msg = base_resp.get("status_msg")
        suffix = f" Trace-Id: {trace_id}" if trace_id else ""
        if status_code == 1004:
            raise ProviderInvocationError(
                "MiniMax rejected the API key or host for vision analysis. "
                "Verify MINIMAX_API_KEY and MINIMAX_API_HOST / MINIMAX_VISION_API_HOST." + suffix
            )
        if status_code == 2038:
            raise ProviderInvocationError(
                "MiniMax requires real-name verification before this vision request can run." + suffix
            )

        raise ProviderInvocationError(
            f"MiniMax vision API error {status_code}: {status_msg or 'unknown error'}{suffix}"
        )

    def _normalize_content(self, content: object) -> str:
        if isinstance(content, str):
            return content.strip()

        if isinstance(content, list):
            parts: list[str] = []
            for item in content:
                if not isinstance(item, dict):
                    continue
                text = item.get("text")
                if isinstance(text, str) and text.strip():
                    parts.append(text.strip())
            return "\n".join(parts)

        return ""
