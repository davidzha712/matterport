from fastapi import APIRouter, Query

from app.models import AuditLogResponse, ReviewQueueResponse
from app.repository import list_audit_events, list_review_queue

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.get("/review-queue", response_model=ReviewQueueResponse)
def get_review_queue(space_id: str | None = Query(default=None, alias="spaceId")) -> ReviewQueueResponse:
    return ReviewQueueResponse(items=list(list_review_queue(space_id=space_id)))


@router.get("/audit-log", response_model=AuditLogResponse)
def get_audit_log(space_id: str | None = Query(default=None, alias="spaceId")) -> AuditLogResponse:
    return AuditLogResponse(items=list(list_audit_events(space_id=space_id)))
