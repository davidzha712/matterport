from fastapi import APIRouter, Query
from fastapi import HTTPException

from app.models import AuditLogResponse, ReviewQueueResponse, WorkflowReadinessResponse
from app.repository import get_space, list_audit_events, list_review_queue
from app.workflow_readiness import build_workflow_readiness

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.get("/review-queue", response_model=ReviewQueueResponse)
def get_review_queue(space_id: str | None = Query(default=None, alias="spaceId")) -> ReviewQueueResponse:
    return ReviewQueueResponse(items=list(list_review_queue(space_id=space_id)))


@router.get("/audit-log", response_model=AuditLogResponse)
def get_audit_log(space_id: str | None = Query(default=None, alias="spaceId")) -> AuditLogResponse:
    return AuditLogResponse(items=list(list_audit_events(space_id=space_id)))


@router.get("/spaces/{space_id}/readiness", response_model=WorkflowReadinessResponse)
def get_space_workflow_readiness(space_id: str) -> WorkflowReadinessResponse:
    space = get_space(space_id)
    if space is None:
        raise HTTPException(status_code=404, detail="Space not found")

    return WorkflowReadinessResponse(readiness=build_workflow_readiness(space))
