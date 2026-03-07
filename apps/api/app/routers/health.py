from fastapi import APIRouter

from app.models import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/healthz", response_model=HealthResponse)
def healthcheck() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="matterport-platform-api",
        version="0.1.0",
    )

