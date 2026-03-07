from fastapi import APIRouter

from app.settings import get_matterport_settings

router = APIRouter(tags=["integrations"])


@router.get("/integrations/matterport/status")
def get_matterport_status() -> dict[str, object]:
    settings = get_matterport_settings()

    return {
        "service": "matterport",
        "apiTokenConfigured": bool(settings.api_token_id and settings.api_token_secret),
        "embedSdkConfigured": bool(settings.sdk_key),
        "mode": "public-showcase-ready",
    }

