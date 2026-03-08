from __future__ import annotations

import httpx

from app.ai.errors import ProviderInvocationError, TaskInputValidationError
from app.ai.providers.shared import SYSTEM_PROMPTS, normalize_image_source
from app.ai.schemas import AITaskOutput, AITaskRequest


class OpenAICompatibleAdapter:
    provider_id = "compatible"
    label = "OpenAI Compatible"
    supported_task_types = frozenset({"vision-detect", "narrative-summarize", "workflow-assist"})

    def __init__(
        self,
        api_key: str | None,
        provider_id: str,
        label: str,
        base_url: str = "https://api.openai.com/v1",
        text_model: str = "gpt-4o",
        vision_model: str = "gpt-4o",
        timeout_seconds: float = 30.0,
    ) -> None:
        self._api_key = api_key
        self.provider_id = provider_id
        self.label = label
        self._base_url = base_url.rstrip("/")
        self._text_model = text_model
        self._vision_model = vision_model
        self._timeout_seconds = timeout_seconds

    def is_configured(self) -> bool:
        return bool(self._api_key)

    def supports(self, task_type: str) -> bool:
        return task_type in self.supported_task_types

    def run(self, task: AITaskRequest) -> AITaskOutput:
        if task.task_type == "vision-detect":
            return self._invoke_vision_task(task)

        summary = self._invoke_text_task(task)
        
        return AITaskOutput(
            summary=summary,
            structuredData={
                "spaceId": task.input.space_id,
                "roomId": task.input.room_id,
                "model": self._text_model,
            },
            warnings=[
                f"{self.label} analysis is a suggestion and requires human review.",
            ],
        )

    def _invoke_text_task(self, task: AITaskRequest) -> str:
        if not self._api_key:
            raise ProviderInvocationError(f"{self.label} is not configured.")

        system_prompt = SYSTEM_PROMPTS[task.task_type]
        user_message = self._build_user_message(task)
        
        payload = {
            "model": self._text_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "temperature": 0.3,
        }

        return self._send_request(payload)

    def _invoke_vision_task(self, task: AITaskRequest) -> AITaskOutput:
        if not self._api_key:
            raise ProviderInvocationError(f"{self.label} is not configured.")

        image_url, image_origin = self._extract_image_url(task)
        
        payload = {
            "model": self._vision_model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": self._build_vision_prompt(task)},
                        {
                            "type": "image_url",
                            "image_url": {"url": image_url},
                        },
                    ],
                }
            ],
            "max_tokens": 500,
        }

        summary = self._send_request(payload)
        
        return AITaskOutput(
            summary=summary,
            structuredData={
                "spaceId": task.input.space_id,
                "roomId": task.input.room_id,
                "model": self._vision_model,
                "imageOrigin": image_origin,
            },
            warnings=[
                f"{self.label} vision detections are suggestions and require human confirmation.",
            ],
        )

    def _send_request(self, payload: dict) -> str:
        try:
            with httpx.Client(timeout=self._timeout_seconds) as client:
                response = client.post(
                    f"{self._base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self._api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                response.raise_for_status()
                return response.json()["choices"][0]["message"]["content"].strip()
        except httpx.HTTPError as exc:
            raise ProviderInvocationError(f"{self.label} request failed: {exc}") from exc
        except (KeyError, IndexError, ValueError) as exc:
            raise ProviderInvocationError(f"{self.label} response format error: {exc}") from exc

    def _build_user_message(self, task: AITaskRequest) -> str:
        ctx = task.input.context
        context_parts = []
        if ctx.capture_mode:
            context_parts.append(f"Capture mode: {ctx.capture_mode}")
        if ctx.matterport_model_sid:
            context_parts.append(f"Model: {ctx.matterport_model_sid}")
        if ctx.mode:
            context_parts.append(f"Mode: {ctx.mode}")
        context_str = ", ".join(context_parts) if context_parts else "none"
        return f"Prompt: {task.input.prompt}\nContext: {context_str}"

    def _build_vision_prompt(self, task: AITaskRequest) -> str:
        return (
            "Analyze this image from an immersive space. "
            "Identify key objects and their condition. "
            f"User prompt: {task.input.prompt}"
        )

    def _extract_image_url(self, task: AITaskRequest) -> tuple[str, str]:
        for attachment in task.input.attachments:
            if attachment.kind == "image" and attachment.url:
                return normalize_image_source(attachment.url)
        raise TaskInputValidationError("Vision task requires an image attachment.")


class OpenAIAdapter(OpenAICompatibleAdapter):
    def __init__(
        self,
        api_key: str | None,
        base_url: str = "https://api.openai.com/v1",
        text_model: str = "gpt-4o",
        vision_model: str = "gpt-4o",
        timeout_seconds: float = 30.0,
    ) -> None:
        super().__init__(
            api_key=api_key,
            provider_id="openai",
            label="OpenAI",
            base_url=base_url,
            text_model=text_model,
            vision_model=vision_model,
            timeout_seconds=timeout_seconds,
        )
