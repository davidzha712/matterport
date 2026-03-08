import logging
from functools import lru_cache

from fastapi import APIRouter, HTTPException

from app.ai import (
    AIRouter,
    NoProviderAvailableError,
    ProviderInvocationError,
    TaskInputValidationError,
)
from app.ai.schemas import AITaskRequest, AITaskResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["ai"])


@lru_cache(maxsize=1)
def _get_ai_router() -> AIRouter:
    return AIRouter()


@router.post("/tasks", response_model=AITaskResponse)
def create_ai_task(task: AITaskRequest) -> AITaskResponse:
    logger.info(
        "AI task requested: type=%s space=%s prompt_len=%d attachments=%d",
        task.task_type,
        task.input.space_id,
        len(task.input.prompt),
        len(task.input.attachments),
    )
    try:
        return _get_ai_router().execute(task)
    except TaskInputValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except NoProviderAvailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ProviderInvocationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
