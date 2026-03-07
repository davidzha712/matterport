from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


WorkflowStatus = Literal["Active", "Pilot", "Needs Review"]
ObjectStatus = Literal["Reviewed", "Needs Review", "Approved"]
Disposition = Literal["Keep", "Sell", "Donate", "Archive"]
PriorityBand = Literal["High", "Medium", "Low"]
Vertical = Literal["Estate", "Museum", "Collection"]
SpaceMode = Literal["estate", "museum", "inventory", "story"]


class AliasedModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    version: str


class SpaceSummary(AliasedModel):
    id: str
    title: str
    matterport_model_sid: str | None = Field(default=None, alias="matterportModelSid")
    mode: SpaceMode
    visibility: Literal["public", "private"]
    room_count: int = Field(alias="roomCount")
    object_count: int = Field(alias="objectCount")


class ProjectSummary(AliasedModel):
    id: str
    title: str
    description: str
    category: Literal["estate", "museum", "collection"]
    spaces: list[SpaceSummary]


class ProviderSummary(AliasedModel):
    id: str
    label: str
    configured: bool
    multimodal: bool
    task_classes: list[str] = Field(alias="taskClasses")
    preferred_for: list[str] = Field(alias="preferredFor")


class ObjectRecord(AliasedModel):
    ai_summary: str = Field(alias="aiSummary")
    disposition: Disposition
    id: str
    room_id: str = Field(alias="roomId")
    room_name: str = Field(alias="roomName")
    status: ObjectStatus
    title: str
    type: str


class RoomRecord(AliasedModel):
    id: str
    name: str
    object_ids: list[str] = Field(alias="objectIds")
    pending_review_count: int = Field(alias="pendingReviewCount")
    priority_band: PriorityBand = Field(alias="priorityBand")
    recommendation: str
    summary: str


class WorkflowSummary(AliasedModel):
    approved_count: int = Field(alias="approvedCount")
    pending_review_count: int = Field(alias="pendingReviewCount")
    reviewed_count: int = Field(alias="reviewedCount")


class SpaceRecord(AliasedModel):
    id: str
    matterport_model_sid: str | None = Field(default=None, alias="matterportModelSid")
    mode: SpaceMode = "estate"
    name: str
    objects: list[ObjectRecord]
    project_id: str = Field(alias="projectId")
    project_name: str = Field(alias="projectName")
    rooms: list[RoomRecord]
    summary: str
    workflow: WorkflowSummary


class ProjectRecord(AliasedModel):
    id: str
    name: str
    spaces: list[SpaceRecord]
    status: WorkflowStatus
    summary: str
    vertical: Vertical


class ReviewQueueItem(AliasedModel):
    disposition: Disposition
    object_id: str = Field(alias="objectId")
    object_title: str = Field(alias="objectTitle")
    priority_band: PriorityBand = Field(alias="priorityBand")
    project_id: str = Field(alias="projectId")
    project_name: str = Field(alias="projectName")
    room_id: str = Field(alias="roomId")
    room_name: str = Field(alias="roomName")
    space_id: str = Field(alias="spaceId")
    space_name: str = Field(alias="spaceName")
    status: ObjectStatus


class AuditDelta(AliasedModel):
    disposition: Disposition
    status: ObjectStatus


class AuditEvent(AliasedModel):
    id: str
    action: Literal["object-updated"]
    after: AuditDelta
    before: AuditDelta
    note: str | None = None
    object_id: str = Field(alias="objectId")
    object_title: str = Field(alias="objectTitle")
    reviewer: str
    room_id: str = Field(alias="roomId")
    room_name: str = Field(alias="roomName")
    space_id: str = Field(alias="spaceId")
    space_name: str = Field(alias="spaceName")
    timestamp: datetime


class ObjectWorkflowUpdateRequest(AliasedModel):
    disposition: Disposition | None = None
    note: str | None = Field(default=None, max_length=500)
    reviewer: str = Field(default="curatorial-operator", min_length=2, max_length=80)
    status: ObjectStatus | None = None


class ObjectWorkflowUpdateResponse(AliasedModel):
    audit_event: AuditEvent = Field(alias="auditEvent")
    object_record: ObjectRecord = Field(alias="objectRecord")
    workflow: WorkflowSummary


class ProjectListResponse(BaseModel):
    items: list[ProjectSummary]


class SpaceListResponse(BaseModel):
    items: list[SpaceSummary]


class ProviderListResponse(BaseModel):
    items: list[ProviderSummary]


class ProjectCatalogResponse(BaseModel):
    items: list[ProjectRecord]


class ReviewQueueResponse(BaseModel):
    items: list[ReviewQueueItem]


class AuditLogResponse(BaseModel):
    items: list[AuditEvent]


class RoomListResponse(BaseModel):
    items: list[RoomRecord]


class ObjectListResponse(BaseModel):
    items: list[ObjectRecord]
