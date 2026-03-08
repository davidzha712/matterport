from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from app.ai.registry import build_provider_summaries
from app.models import (
    AnnotationCreateRequest,
    AnnotationUpdateRequest,
    AuditEvent,
    ObjectRecord,
    ObjectWorkflowUpdateRequest,
    ProjectRecord,
    ProjectSummary,
    ProviderSummary,
    ReviewQueueItem,
    RoomRecord,
    SpaceRecord,
    SpatialAnnotation,
    SpaceSummary,
    WorkflowSummary,
)
from app import memory_repository, sanity_repository
from app.settings import get_content_repository_settings


def _get_repository() -> Any:
    settings = get_content_repository_settings()

    if settings.backend == "memory":
        return memory_repository

    if settings.backend == "sanity":
        return sanity_repository

    return sanity_repository if settings.is_sanity_configured() else memory_repository


def reset_repository_state() -> None:
    _get_repository().reset_repository_state()


def list_project_records() -> Sequence[ProjectRecord]:
    return _get_repository().list_project_records()


def list_projects() -> Sequence[ProjectSummary]:
    return _get_repository().list_projects()


def get_project(project_id: str) -> ProjectSummary | None:
    return _get_repository().get_project(project_id)


def get_project_record(project_id: str) -> ProjectRecord | None:
    return _get_repository().get_project_record(project_id)


def list_spaces(project_id: str) -> Sequence[SpaceSummary] | None:
    return _get_repository().list_spaces(project_id)


def get_space(space_id: str) -> SpaceRecord | None:
    return _get_repository().get_space(space_id)


def list_rooms(space_id: str) -> Sequence[RoomRecord] | None:
    return _get_repository().list_rooms(space_id)


def get_room(space_id: str, room_id: str) -> RoomRecord | None:
    return _get_repository().get_room(space_id, room_id)


def list_objects(space_id: str) -> Sequence[ObjectRecord] | None:
    return _get_repository().list_objects(space_id)


def get_object(space_id: str, object_id: str) -> ObjectRecord | None:
    return _get_repository().get_object(space_id, object_id)


def list_review_queue(space_id: str | None = None) -> Sequence[ReviewQueueItem]:
    return _get_repository().list_review_queue(space_id=space_id)


def list_audit_events(space_id: str | None = None) -> Sequence[AuditEvent]:
    return _get_repository().list_audit_events(space_id=space_id)


def update_object_workflow(
    space_id: str, object_id: str, change: ObjectWorkflowUpdateRequest
) -> tuple[ObjectRecord, WorkflowSummary, AuditEvent] | None:
    return _get_repository().update_object_workflow(space_id, object_id, change)


def list_providers() -> Sequence[ProviderSummary]:
    return build_provider_summaries()


def list_annotations(space_id: str) -> list[SpatialAnnotation]:
    return memory_repository.list_annotations(space_id)


def create_annotation(space_id: str, body: AnnotationCreateRequest) -> SpatialAnnotation:
    return memory_repository.create_annotation(space_id, body)


def update_annotation(
    space_id: str, annotation_id: str, body: AnnotationUpdateRequest
) -> SpatialAnnotation | None:
    return memory_repository.update_annotation(space_id, annotation_id, body)


def delete_annotation(space_id: str, annotation_id: str) -> bool:
    return memory_repository.delete_annotation(space_id, annotation_id)
