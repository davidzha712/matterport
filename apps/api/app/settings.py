from pathlib import Path
import os

from pydantic import BaseModel


class MatterportSettings(BaseModel):
    api_token_id: str | None = None
    api_token_secret: str | None = None
    sdk_key: str | None = None


class AIProviderSettings(BaseModel):
    openai_api_key: str | None = None
    qwen_api_key: str | None = None
    kimi_api_key: str | None = None
    minimax_api_key: str | None = None
    minimax_api_host: str = "https://api.minimax.io"
    minimax_api_base_url: str = "https://api.minimaxi.chat/v1"
    minimax_text_model: str = "MiniMax-M1"
    minimax_timeout_seconds: float = 30.0
    minimax_vision_timeout_seconds: float = 45.0


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
        qwen_api_key=os.getenv("QWEN_API_KEY") or local_env.get("QWEN_API_KEY"),
        kimi_api_key=os.getenv("KIMI_API_KEY") or local_env.get("KIMI_API_KEY"),
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
