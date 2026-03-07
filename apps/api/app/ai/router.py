from __future__ import annotations

from dataclasses import dataclass

from app.ai.errors import TaskInputValidationError
from app.ai.providers.base import ProviderAdapter
from app.ai.registry import build_routing_adapters
from app.ai.schemas import AIProviderSelection, AITaskRequest, AITaskResponse
from app.settings import AIProviderSettings, get_ai_provider_settings


class NoProviderAvailableError(RuntimeError):
    pass


@dataclass(frozen=True)
class RoutingDecision:
    adapter: ProviderAdapter
    reason: str


class AIRouter:
    def __init__(self, settings: AIProviderSettings | None = None) -> None:
        self._settings = settings or get_ai_provider_settings()
        self._adapters = build_routing_adapters(self._settings)

    def route(self, task: AITaskRequest) -> RoutingDecision:
        for adapter in self._adapters:
            if adapter.supports(task.task_type) and adapter.is_configured():
                return RoutingDecision(
                    adapter=adapter,
                    reason=(
                        f"{adapter.label} is configured and supports task type "
                        f"'{task.task_type}'."
                    ),
                )

        raise NoProviderAvailableError(
            f"No configured AI provider is available for task type '{task.task_type}'."
        )

    def execute(self, task: AITaskRequest) -> AITaskResponse:
        decision = self.route(task)
        return AITaskResponse(
            taskType=task.task_type,
            provider=AIProviderSelection(
                providerId=decision.adapter.provider_id,
                configured=decision.adapter.is_configured(),
                reason=decision.reason,
            ),
            output=decision.adapter.run(task),
        )
