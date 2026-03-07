from fastapi import APIRouter

from app.models import ProviderListResponse
from app.repository import list_providers

router = APIRouter(prefix="/providers", tags=["providers"])


@router.get("", response_model=ProviderListResponse)
def get_providers() -> ProviderListResponse:
    return ProviderListResponse(items=list(list_providers()))

