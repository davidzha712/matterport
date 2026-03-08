from __future__ import annotations

from app.ai.providers.openai import OpenAICompatibleAdapter


class QwenAdapter(OpenAICompatibleAdapter):
    def __init__(
        self,
        api_key: str | None,
        base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1",
        text_model: str = "qwen-max",
        vision_model: str = "qwen-vl-max-latest",
        timeout_seconds: float = 30.0,
    ) -> None:
        super().__init__(
            api_key=api_key,
            provider_id="qwen",
            label="Qwen",
            base_url=base_url,
            text_model=text_model,
            vision_model=vision_model,
            timeout_seconds=timeout_seconds,
        )
