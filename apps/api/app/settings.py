from pathlib import Path
import os

from pydantic import BaseModel


class MatterportSettings(BaseModel):
    api_token_id: str | None = None
    api_token_secret: str | None = None
    sdk_key: str | None = None


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
