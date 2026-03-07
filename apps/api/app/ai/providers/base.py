from __future__ import annotations

from typing import Protocol

from app.ai.schemas import AITaskOutput, AITaskRequest


class ProviderAdapter(Protocol):
    provider_id: str
    label: str
    supported_task_types: frozenset[str]

    def is_configured(self) -> bool:
        ...

    def supports(self, task_type: str) -> bool:
        ...

    def run(self, task: AITaskRequest) -> AITaskOutput:
        ...
