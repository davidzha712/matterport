from __future__ import annotations

from app.ai.providers.openai import OpenAICompatibleAdapter


class KimiAdapter(OpenAICompatibleAdapter):
    def __init__(
        self,
        api_key: str | None,
        base_url: str = "https://api.moonshot.cn/v1",
        text_model: str = "moonshot-v1-32k",
        vision_model: str = "moonshot-v1-32k",
        timeout_seconds: float = 30.0,
    ) -> None:
        super().__init__(
            api_key=api_key,
            provider_id="kimi",
            label="Kimi",
            base_url=base_url,
            text_model=text_model,
            vision_model=vision_model,
            timeout_seconds=timeout_seconds,
        )
