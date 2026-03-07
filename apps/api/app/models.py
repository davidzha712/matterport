from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    version: str


class SpaceSummary(BaseModel):
    id: str
    title: str
    matterport_model_sid: str = Field(alias="matterportModelSid")
    mode: Literal["estate", "museum", "inventory", "story"]
    visibility: Literal["public", "private"]
    room_count: int = Field(alias="roomCount")
    object_count: int = Field(alias="objectCount")


class ProjectSummary(BaseModel):
    id: str
    title: str
    description: str
    category: Literal["estate", "museum", "hybrid"]
    spaces: list[SpaceSummary]


class ProviderSummary(BaseModel):
    id: str
    label: str
    configured: bool
    multimodal: bool
    task_classes: list[str] = Field(alias="taskClasses")
    preferred_for: list[str] = Field(alias="preferredFor")


class ProjectListResponse(BaseModel):
    items: list[ProjectSummary]


class SpaceListResponse(BaseModel):
    items: list[SpaceSummary]


class ProviderListResponse(BaseModel):
    items: list[ProviderSummary]

