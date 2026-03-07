from __future__ import annotations

from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


TaskType = Literal["vision-detect", "narrative-summarize", "workflow-assist"]


class AliasedModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class AITaskAttachment(AliasedModel):
    kind: Literal["image", "document", "audio", "video"] = "image"
    url: str | None = None
    label: str | None = None


class AITaskInput(AliasedModel):
    prompt: str = Field(min_length=1, max_length=4_000)
    project_id: str | None = Field(default=None, alias="projectId")
    space_id: str | None = Field(default=None, alias="spaceId")
    room_id: str | None = Field(default=None, alias="roomId")
    attachments: list[AITaskAttachment] = Field(default_factory=list)
    context: dict[str, Any] = Field(default_factory=dict)


class AITaskRequest(AliasedModel):
    task_type: TaskType = Field(alias="taskType")
    input: AITaskInput


class AIProviderSelection(AliasedModel):
    provider_id: str = Field(alias="providerId")
    configured: bool
    reason: str


class AITaskOutput(AliasedModel):
    summary: str
    structured_data: dict[str, Any] = Field(default_factory=dict, alias="structuredData")
    warnings: list[str] = Field(default_factory=list)


class AITaskResponse(AliasedModel):
    task_id: str = Field(default_factory=lambda: f"ai_{uuid4().hex[:12]}", alias="taskId")
    status: Literal["completed"] = "completed"
    task_type: TaskType = Field(alias="taskType")
    provider: AIProviderSelection
    output: AITaskOutput
