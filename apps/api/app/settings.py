import os
from pathlib import Path
from typing import Literal

from pydantic import BaseModel


class MatterportSettings(BaseModel):
    api_token_id: str | None = None
    api_token_secret: str | None = None
    sdk_key: str | None = None


class AIProviderSettings(BaseModel):
    openai_api_key: str | None = None
    openai_api_base_url: str = "https://api.openai.com/v1"
    openai_text_model: str = "gpt-4o"
    openai_vision_model: str = "gpt-4o"
    openai_timeout_seconds: float = 30.0
    qwen_api_key: str | None = None
    qwen_api_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    qwen_text_model: str = "qwen-max"
    qwen_vision_model: str = "qwen-vl-max-latest"
    qwen_timeout_seconds: float = 30.0
    kimi_api_key: str | None = None
    kimi_api_base_url: str = "https://api.moonshot.cn/v1"
    kimi_text_model: str = "moonshot-v1-32k"
    kimi_vision_model: str = "moonshot-v1-32k"
    kimi_timeout_seconds: float = 30.0
    minimax_api_key: str | None = None
    minimax_api_host: str = "https://api.minimax.io"
    minimax_api_base_url: str = "https://api.minimaxi.chat/v1"
    minimax_text_model: str = "MiniMax-M1"
    minimax_timeout_seconds: float = 30.0
    minimax_vision_timeout_seconds: float = 45.0


class ContentRepositorySettings(BaseModel):
    backend: Literal["auto", "memory", "sanity"] = "auto"
    sanity_api_version: str = "2024-01-01"
    sanity_dataset: str = "production"
    sanity_project_id: str | None = None
    sanity_read_token: str | None = None
    sanity_write_token: str | None = None

    def is_sanity_configured(self) -> bool:
        return bool(self.sanity_project_id and self.sanity_dataset)


def _read_local_env() -> dict[str, str]:
    env_path = Path(__file__).resolve().parents[3] / ".env.local"

    if not env_path.exists():
        return {}

    values: dict[str, str] = {}

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()

    return values


def get_matterport_settings() -> MatterportSettings:
    local_env = _read_local_env()

    return MatterportSettings(
        api_token_id=os.getenv("MATTERPORT_API_TOKEN_ID") or local_env.get("MATTERPORT_API_TOKEN_ID"),
        api_token_secret=os.getenv("MATTERPORT_API_TOKEN_SECRET") or local_env.get("MATTERPORT_API_TOKEN_SECRET"),
        sdk_key=os.getenv("NEXT_PUBLIC_MATTERPORT_SDK_KEY") or local_env.get("NEXT_PUBLIC_MATTERPORT_SDK_KEY"),
    )


def get_ai_provider_settings() -> AIProviderSettings:
    local_env = _read_local_env()

    return AIProviderSettings(
        openai_api_key=os.getenv("OPENAI_API_KEY") or local_env.get("OPENAI_API_KEY"),
        openai_api_base_url=(
            os.getenv("OPENAI_API_BASE_URL")
            or local_env.get("OPENAI_API_BASE_URL")
            or "https://api.openai.com/v1"
        ),
        openai_text_model=(
            os.getenv("OPENAI_TEXT_MODEL")
            or local_env.get("OPENAI_TEXT_MODEL")
            or "gpt-4o"
        ),
        openai_vision_model=(
            os.getenv("OPENAI_VISION_MODEL")
            or local_env.get("OPENAI_VISION_MODEL")
            or os.getenv("OPENAI_TEXT_MODEL")
            or local_env.get("OPENAI_TEXT_MODEL")
            or "gpt-4o"
        ),
        openai_timeout_seconds=float(
            os.getenv("OPENAI_TIMEOUT_SECONDS")
            or local_env.get("OPENAI_TIMEOUT_SECONDS")
            or 30.0
        ),
        qwen_api_key=os.getenv("QWEN_API_KEY") or local_env.get("QWEN_API_KEY"),
        qwen_api_base_url=(
            os.getenv("QWEN_API_BASE_URL")
            or local_env.get("QWEN_API_BASE_URL")
            or "https://dashscope.aliyuncs.com/compatible-mode/v1"
        ),
        qwen_text_model=(
            os.getenv("QWEN_TEXT_MODEL")
            or local_env.get("QWEN_TEXT_MODEL")
            or "qwen-max"
        ),
        qwen_vision_model=(
            os.getenv("QWEN_VISION_MODEL")
            or local_env.get("QWEN_VISION_MODEL")
            or os.getenv("QWEN_TEXT_MODEL")
            or local_env.get("QWEN_TEXT_MODEL")
            or "qwen-vl-max-latest"
        ),
        qwen_timeout_seconds=float(
            os.getenv("QWEN_TIMEOUT_SECONDS")
            or local_env.get("QWEN_TIMEOUT_SECONDS")
            or 30.0
        ),
        kimi_api_key=os.getenv("KIMI_API_KEY") or local_env.get("KIMI_API_KEY"),
        kimi_api_base_url=(
            os.getenv("KIMI_API_BASE_URL")
            or local_env.get("KIMI_API_BASE_URL")
            or "https://api.moonshot.cn/v1"
        ),
        kimi_text_model=(
            os.getenv("KIMI_TEXT_MODEL")
            or local_env.get("KIMI_TEXT_MODEL")
            or "moonshot-v1-32k"
        ),
        kimi_vision_model=(
            os.getenv("KIMI_VISION_MODEL")
            or local_env.get("KIMI_VISION_MODEL")
            or os.getenv("KIMI_TEXT_MODEL")
            or local_env.get("KIMI_TEXT_MODEL")
            or "moonshot-v1-32k"
        ),
        kimi_timeout_seconds=float(
            os.getenv("KIMI_TIMEOUT_SECONDS")
            or local_env.get("KIMI_TIMEOUT_SECONDS")
            or 30.0
        ),
        minimax_api_key=os.getenv("MINIMAX_API_KEY") or local_env.get("MINIMAX_API_KEY"),
        minimax_api_host=(
            os.getenv("MINIMAX_API_HOST")
            or local_env.get("MINIMAX_API_HOST")
            or "https://api.minimax.io"
        ),
        minimax_api_base_url=(
            os.getenv("MINIMAX_API_BASE_URL")
            or local_env.get("MINIMAX_API_BASE_URL")
            or "https://api.minimaxi.chat/v1"
        ),
        minimax_text_model=(
            os.getenv("MINIMAX_TEXT_MODEL")
            or local_env.get("MINIMAX_TEXT_MODEL")
            or "MiniMax-M1"
        ),
        minimax_timeout_seconds=float(
            os.getenv("MINIMAX_TIMEOUT_SECONDS")
            or local_env.get("MINIMAX_TIMEOUT_SECONDS")
            or 30.0
        ),
        minimax_vision_timeout_seconds=float(
            os.getenv("MINIMAX_VISION_TIMEOUT_SECONDS")
            or local_env.get("MINIMAX_VISION_TIMEOUT_SECONDS")
            or os.getenv("MINIMAX_TIMEOUT_SECONDS")
            or local_env.get("MINIMAX_TIMEOUT_SECONDS")
            or 45.0
        ),
    )


def get_content_repository_settings() -> ContentRepositorySettings:
    local_env = _read_local_env()

    return ContentRepositorySettings(
        backend=(
            os.getenv("MATTERPORT_CONTENT_BACKEND")
            or local_env.get("MATTERPORT_CONTENT_BACKEND")
            or "auto"
        ),
        sanity_api_version=(
            os.getenv("SANITY_API_VERSION")
            or local_env.get("SANITY_API_VERSION")
            or "2024-01-01"
        ),
        sanity_dataset=(
            os.getenv("SANITY_DATASET")
            or local_env.get("SANITY_DATASET")
            or os.getenv("NEXT_PUBLIC_SANITY_DATASET")
            or local_env.get("NEXT_PUBLIC_SANITY_DATASET")
            or "production"
        ),
        sanity_project_id=(
            os.getenv("SANITY_PROJECT_ID")
            or local_env.get("SANITY_PROJECT_ID")
            or os.getenv("NEXT_PUBLIC_SANITY_PROJECT_ID")
            or local_env.get("NEXT_PUBLIC_SANITY_PROJECT_ID")
        ),
        sanity_read_token=(
            os.getenv("SANITY_API_READ_TOKEN")
            or local_env.get("SANITY_API_READ_TOKEN")
        ),
        sanity_write_token=(
            os.getenv("SANITY_API_WRITE_TOKEN")
            or local_env.get("SANITY_API_WRITE_TOKEN")
        ),
    )
