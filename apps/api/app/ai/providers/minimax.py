from __future__ import annotations

import httpx

from app.ai.schemas import AITaskOutput, AITaskRequest


class ProviderInvocationError(RuntimeError):
    pass


SYSTEM_PROMPTS: dict[str, str] = {
    "narrative-summarize": (
        "You are a museum-grade interpretive writer for immersive estate and collection spaces. "
        "Respond in the same language as the user's prompt, stay factual, mark uncertainty "
        "explicitly, and keep the answer concise."
    ),
    "workflow-assist": (
        "You are a human-in-the-loop workflow planner for estate review and collection operations. "
        "Respond in the same language as the user's prompt. Produce a concise, sequenced plan that "
        "never bypasses human approval or publication review."
    ),
}


class MiniMaxAdapter:
    provider_id = "minimax"
    label = "MiniMax"
    supported_task_types = frozenset(
        {"vision-detect", "narrative-summarize", "workflow-assist"}
    )

    def __init__(
        self,
        api_key: str | None,
        api_base_url: str = "https://api.minimaxi.chat/v1",
        text_model: str = "MiniMax-M1",
        timeout_seconds: float = 30.0,
    ) -> None:
        self._api_key = api_key
        self._api_base_url = api_base_url.rstrip("/")
        self._text_model = text_model
        self._timeout_seconds = timeout_seconds

    def is_configured(self) -> bool:
        return bool(self._api_key)

    def supports(self, task_type: str) -> bool:
        return task_type in self.supported_task_types

    def run(self, task: AITaskRequest) -> AITaskOutput:
        if task.task_type == "vision-detect":
            return self._build_vision_fallback(task)

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

    def _build_vision_fallback(self, task: AITaskRequest) -> AITaskOutput:
        prompt_preview = task.input.prompt.strip()[:160]
        attachment_count = len(task.input.attachments)

        return AITaskOutput(
            summary=(
                "MiniMax is configured, but this vision task currently remains in review-first fallback "
                "mode until a native multimodal endpoint is wired."
            ),
            structuredData={
                "spaceId": task.input.space_id,
                "roomId": task.input.room_id,
                "attachmentCount": attachment_count,
                "candidateDetections": [
                    "primary furnishing cluster",
                    "decorative object group",
                    "surface-level labels requiring OCR review",
                ],
                "deliveryMode": "fallback-review",
                "model": self._text_model,
                "promptPreview": prompt_preview,
            },
            warnings=[
                "MiniMax supports multimodal models, but the currently wired OpenAI-compatible endpoint is text-only.",
                "Wire a native MiniMax visual-language endpoint before treating vision detections as live inference.",
                "Human confirmation is required before any object status or publication change.",
            ],
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
