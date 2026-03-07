from fastapi import APIRouter, HTTPException

from app.ai import (
    AIRouter,
    NoProviderAvailableError,
    ProviderInvocationError,
    TaskInputValidationError,
)
from app.ai.schemas import AITaskRequest, AITaskResponse

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/tasks", response_model=AITaskResponse)
def create_ai_task(task: AITaskRequest) -> AITaskResponse:
    try:
        return AIRouter().execute(task)
    except TaskInputValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except NoProviderAvailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ProviderInvocationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
