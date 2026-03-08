from __future__ import annotations

import logging
from dataclasses import dataclass

from app.ai.errors import ProviderInvocationError, TaskInputValidationError
from app.ai.providers.base import ProviderAdapter
from app.ai.registry import build_routing_adapters, get_task_routing_order
from app.ai.schemas import AIProviderSelection, AITaskRequest, AITaskResponse
from app.settings import AIProviderSettings, get_ai_provider_settings

logger = logging.getLogger(__name__)


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
        self._adapter_map = {adapter.provider_id: adapter for adapter in self._adapters}

    def _build_candidate_chain(self, task: AITaskRequest) -> list[RoutingDecision]:
        preferred_provider_ids = get_task_routing_order(task.task_type)
        ordered_adapters = [
            self._adapter_map[provider_id]
            for provider_id in preferred_provider_ids
            if provider_id in self._adapter_map
        ]

        candidates: list[RoutingDecision] = []

        for adapter in ordered_adapters:
            if adapter.is_configured() and adapter.supports(task.task_type):
                candidates.append(
                    RoutingDecision(
                        adapter=adapter,
                        reason=(
                            f"{adapter.label} matched the routing policy for "
                            f"'{task.task_type}' and is configured."
                        ),
                    )
                )

        for adapter in self._adapters:
            if adapter in ordered_adapters:
                continue
            if adapter.is_configured() and adapter.supports(task.task_type):
                candidates.append(
                    RoutingDecision(
                        adapter=adapter,
                        reason=(
                            f"{adapter.label} does not appear in the preferred chain for "
                            f"'{task.task_type}', but is configured and supports the task."
                        ),
                    )
                )

        return candidates

    def route(self, task: AITaskRequest) -> RoutingDecision:
        candidates = self._build_candidate_chain(task)
        if not candidates:
            raise NoProviderAvailableError(
                f"No configured AI provider is available for task type '{task.task_type}'."
            )
        return candidates[0]

    def execute(self, task: AITaskRequest) -> AITaskResponse:
        candidates = self._build_candidate_chain(task)
        if not candidates:
            raise NoProviderAvailableError(
                f"No configured AI provider is available for task type '{task.task_type}'."
            )

        last_error: ProviderInvocationError | None = None

        for decision in candidates:
            try:
                output = decision.adapter.run(task)
                return AITaskResponse(
                    taskType=task.task_type,
                    provider=AIProviderSelection(
                        providerId=decision.adapter.provider_id,
                        configured=decision.adapter.is_configured(),
                        reason=decision.reason,
                    ),
                    output=output,
                )
            except ProviderInvocationError as exc:
                last_error = exc
                logger.warning(
                    "Provider %s failed for task %s: %s — trying next",
                    decision.adapter.provider_id,
                    task.task_type,
                    exc,
                )
                continue

        raise last_error or NoProviderAvailableError(
            f"All providers failed for task type '{task.task_type}'."
        )
