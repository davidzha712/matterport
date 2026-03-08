from __future__ import annotations

from collections.abc import Sequence
from copy import deepcopy
from datetime import datetime, timezone
from uuid import uuid4

from app.ai.registry import build_provider_summaries
from app.mock_data import PROJECT_RECORDS
from app.models import (
    AnnotationCreateRequest,
    AnnotationUpdateRequest,
    AuditDelta,
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


_project_state: list[ProjectRecord] = deepcopy(PROJECT_RECORDS)
_audit_events: list[AuditEvent] = []
_annotations: dict[str, list[SpatialAnnotation]] = {}


def reset_repository_state() -> None:
    global _project_state, _audit_events, _annotations
    _project_state = deepcopy(PROJECT_RECORDS)
    _audit_events = []
    _annotations = {}


def _iter_projects() -> list[ProjectRecord]:
    return _project_state


def _find_project(project_id: str) -> ProjectRecord | None:
    return next((project for project in _iter_projects() if project.id == project_id), None)


def _find_space(space_id: str) -> tuple[ProjectRecord, SpaceRecord] | None:
    for project in _iter_projects():
        for space in project.spaces:
            if space.id == space_id:
                return project, space
    return None


def _recompute_space_workflow(space: SpaceRecord) -> None:
    approved_count = sum(1 for item in space.objects if item.status == "Approved")
    reviewed_count = sum(1 for item in space.objects if item.status == "Reviewed")
    pending_review_count = sum(1 for item in space.objects if item.status == "Needs Review")

    room_pending_counts = {
        room.id: sum(1 for item in space.objects if item.room_id == room.id and item.status == "Needs Review")
        for room in space.rooms
    }

    for room in space.rooms:
        room.pending_review_count = room_pending_counts.get(room.id, 0)

    space.workflow = WorkflowSummary(
        approvedCount=approved_count,
        pendingReviewCount=pending_review_count,
        reviewedCount=reviewed_count,
    )


def _build_project_summary(project: ProjectRecord) -> ProjectSummary:
    return ProjectSummary(
        id=project.id,
        title=project.name,
        description=project.summary,
        category=project.vertical.lower(),
        spaces=[
            SpaceSummary(
                id=space.id,
                title=space.name,
                matterportModelSid=space.matterport_model_sid,
                mode=space.mode,
                visibility="public" if space.matterport_model_sid else "private",
                roomCount=len(space.rooms),
                objectCount=len(space.objects),
            )
            for space in project.spaces
        ],
    )


def list_project_records() -> Sequence[ProjectRecord]:
    return _iter_projects()


def list_projects() -> Sequence[ProjectSummary]:
    return [_build_project_summary(project) for project in _iter_projects()]


def get_project(project_id: str) -> ProjectSummary | None:
    project = _find_project(project_id)
    if project is None:
        return None
    return _build_project_summary(project)


def get_project_record(project_id: str) -> ProjectRecord | None:
    return _find_project(project_id)


def list_spaces(project_id: str) -> Sequence[SpaceSummary] | None:
    project = _find_project(project_id)
    if project is None:
        return None
    return _build_project_summary(project).spaces


def get_space(space_id: str) -> SpaceRecord | None:
    located = _find_space(space_id)
    if located is None:
        return None
    return located[1]


def list_rooms(space_id: str) -> Sequence[RoomRecord] | None:
    space = get_space(space_id)
    if space is None:
        return None
    return space.rooms


def get_room(space_id: str, room_id: str) -> RoomRecord | None:
    rooms = list_rooms(space_id)
    if rooms is None:
        return None
    return next((room for room in rooms if room.id == room_id), None)


def list_objects(space_id: str) -> Sequence[ObjectRecord] | None:
    space = get_space(space_id)
    if space is None:
        return None
    return space.objects


def get_object(space_id: str, object_id: str) -> ObjectRecord | None:
    objects = list_objects(space_id)
    if objects is None:
        return None
    return next((object_record for object_record in objects if object_record.id == object_id), None)


def list_review_queue(space_id: str | None = None) -> Sequence[ReviewQueueItem]:
    items: list[ReviewQueueItem] = []

    for project in _iter_projects():
        for space in project.spaces:
            if space_id is not None and space.id != space_id:
                continue

            room_lookup = {room.id: room for room in space.rooms}
            for object_record in space.objects:
                if object_record.status != "Needs Review":
                    continue
                room = room_lookup[object_record.room_id]
                items.append(
                    ReviewQueueItem(
                        disposition=object_record.disposition,
                        objectId=object_record.id,
                        objectTitle=object_record.title,
                        priorityBand=room.priority_band,
                        projectId=project.id,
                        projectName=project.name,
                        roomId=room.id,
                        roomName=room.name,
                        spaceId=space.id,
                        spaceName=space.name,
                        status=object_record.status,
                    )
                )

    return items


def list_audit_events(space_id: str | None = None) -> Sequence[AuditEvent]:
    if space_id is None:
        return list(_audit_events)
    return [event for event in _audit_events if event.space_id == space_id]


def update_object_workflow(
    space_id: str, object_id: str, change: ObjectWorkflowUpdateRequest
) -> tuple[ObjectRecord, WorkflowSummary, AuditEvent] | None:
    located = _find_space(space_id)
    if located is None:
        return None

    _, space = located
    room_lookup = {room.id: room for room in space.rooms}
    object_record = next((item for item in space.objects if item.id == object_id), None)

    if object_record is None:
        return None

    before = AuditDelta(disposition=object_record.disposition, status=object_record.status)

    if change.title is not None:
        object_record.title = change.title

    if change.type is not None:
        object_record.type = change.type

    if change.ai_summary is not None:
        object_record.ai_summary = change.ai_summary

    if change.disposition is not None:
        object_record.disposition = change.disposition

    if change.status is not None:
        object_record.status = change.status
    elif object_record.status == "Needs Review":
        object_record.status = "Reviewed"

    _recompute_space_workflow(space)

    room = room_lookup[object_record.room_id]
    audit_event = AuditEvent(
        id=f"audit_{uuid4().hex[:12]}",
        action="object-updated",
        after=AuditDelta(disposition=object_record.disposition, status=object_record.status),
        before=before,
        note=change.note,
        objectId=object_record.id,
        objectTitle=object_record.title,
        reviewer=change.reviewer,
        roomId=room.id,
        roomName=room.name,
        spaceId=space.id,
        spaceName=space.name,
        timestamp=datetime.now(timezone.utc),
    )
    _audit_events.insert(0, audit_event)

    return object_record, space.workflow, audit_event


def list_providers() -> Sequence[ProviderSummary]:
    return build_provider_summaries()


def list_annotations(space_id: str) -> list[SpatialAnnotation]:
    return list(_annotations.get(space_id, []))


def create_annotation(space_id: str, body: AnnotationCreateRequest) -> SpatialAnnotation:
    annotation = SpatialAnnotation(
        annotationId=f"ann_{uuid4().hex[:12]}",
        spaceId=space_id,
        roomId=body.room_id,
        objectId=body.object_id,
        label=body.label,
        description=body.description,
        position=body.position,
        color=body.color,
        createdBy=body.created_by,
        confidence=body.confidence,
    )
    _annotations.setdefault(space_id, []).append(annotation)
    return annotation


def update_annotation(
    space_id: str, annotation_id: str, body: AnnotationUpdateRequest
) -> SpatialAnnotation | None:
    entries = _annotations.get(space_id, [])
    index = next(
        (i for i, ann in enumerate(entries) if ann.annotation_id == annotation_id),
        None,
    )
    if index is None:
        return None

    existing = entries[index]
    updated = SpatialAnnotation(
        annotationId=existing.annotation_id,
        spaceId=existing.space_id,
        roomId=existing.room_id,
        objectId=body.object_id if body.object_id is not None else existing.object_id,
        label=body.label if body.label is not None else existing.label,
        description=body.description if body.description is not None else existing.description,
        position=body.position if body.position is not None else existing.position,
        color=body.color if body.color is not None else existing.color,
        createdBy=existing.created_by,
        confidence=existing.confidence,
    )
    entries[index] = updated
    return updated


def delete_annotation(space_id: str, annotation_id: str) -> bool:
    entries = _annotations.get(space_id, [])
    index = next(
        (i for i, ann in enumerate(entries) if ann.annotation_id == annotation_id),
        None,
    )
    if index is None:
        return False
    entries.pop(index)
    return True
