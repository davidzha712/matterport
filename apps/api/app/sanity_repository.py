from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime, timezone
from uuid import uuid4

import httpx

from app.models import (
    AuditDelta,
    AuditEvent,
    ObjectRecord,
    ObjectWorkflowUpdateRequest,
    ProjectRecord,
    ProjectSummary,
    ReviewQueueItem,
    RoomRecord,
    SpaceRecord,
    SpaceSummary,
    WorkflowSummary,
)
from app.settings import get_content_repository_settings


CONTROL_ROOM_SNAPSHOT_QUERY = """{
  "projects": *[_type == "spaceProject"] | order(title asc){
    _id,
    projectId,
    title,
    "slug": slug.current,
    vertical,
    status,
    summary
  },
  "spaces": *[_type == "spaceRecord"] | order(coalesce(sortOrder, 999), title asc){
    _id,
    spaceId,
    title,
    matterportModelSid,
    mode,
    summary,
    sortOrder,
    "projectRef": project->_id,
    "projectTitle": project->title,
    "projectId": coalesce(project->projectId, project->slug.current, project->_id)
  },
  "rooms": *[_type == "roomRecord"] | order(coalesce(sortOrder, 999), title asc){
    _id,
    roomId,
    title,
    priorityBand,
    recommendation,
    summary,
    sortOrder,
    "spaceRef": space->_id
  },
  "objects": *[_type == "objectRecord"] | order(coalesce(sortOrder, 999), title asc){
    _id,
    _rev,
    objectId,
    title,
    objectType,
    status,
    disposition,
    aiSummary,
    operatorNote,
    sortOrder,
    "spaceRef": space->_id,
    "roomRef": room->_id,
    "roomTitle": room->title,
    "roomId": coalesce(room->roomId, room->_id)
  },
  "auditEvents": *[_type == "workflowAuditEvent"] | order(eventTimestamp desc){
    _id,
    eventId,
    reviewer,
    note,
    beforeDisposition,
    beforeStatus,
    afterDisposition,
    afterStatus,
    eventTimestamp,
    "spaceRef": space->_id,
    "spaceId": coalesce(space->spaceId, space->_id),
    "spaceTitle": space->title,
    "roomRef": room->_id,
    "roomId": coalesce(room->roomId, room->_id),
    "roomTitle": room->title,
    "objectRef": object->_id,
    "objectId": coalesce(object->objectId, object->_id),
    "objectTitle": object->title
  }
}"""


class SanityRepositoryError(RuntimeError):
    pass


def _build_data_api_base_url() -> str:
    settings = get_content_repository_settings()

    if not settings.sanity_project_id:
        raise SanityRepositoryError("SANITY_PROJECT_ID or NEXT_PUBLIC_SANITY_PROJECT_ID is not configured")

    return (
        f"https://{settings.sanity_project_id}.api.sanity.io"
        f"/v{settings.sanity_api_version}/data"
    )


def _build_query_url() -> str:
    settings = get_content_repository_settings()
    return f"{_build_data_api_base_url()}/query/{settings.sanity_dataset}"


def _build_mutation_url() -> str:
    settings = get_content_repository_settings()
    return f"{_build_data_api_base_url()}/mutate/{settings.sanity_dataset}"


def _build_read_headers() -> dict[str, str]:
    settings = get_content_repository_settings()
    token = settings.sanity_read_token or settings.sanity_write_token

    if not token:
        return {}

    return {"Authorization": f"Bearer {token}"}


def _build_write_headers() -> dict[str, str]:
    settings = get_content_repository_settings()

    if not settings.sanity_write_token:
        raise SanityRepositoryError("SANITY_API_WRITE_TOKEN is not configured")

    return {
        "Authorization": f"Bearer {settings.sanity_write_token}",
        "Content-Type": "application/json",
    }


import threading
import time as _time

_snapshot_cache: dict | None = None
_snapshot_cache_time: float = 0.0
_snapshot_cache_lock = threading.Lock()
_SNAPSHOT_TTL_SECONDS = 30.0


def _fetch_snapshot() -> dict:
    global _snapshot_cache, _snapshot_cache_time

    now = _time.monotonic()
    if _snapshot_cache is not None and (now - _snapshot_cache_time) < _SNAPSHOT_TTL_SECONDS:
        return _snapshot_cache

    with _snapshot_cache_lock:
        now = _time.monotonic()
        if _snapshot_cache is not None and (now - _snapshot_cache_time) < _SNAPSHOT_TTL_SECONDS:
            return _snapshot_cache

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.get(
                    _build_query_url(),
                    headers=_build_read_headers(),
                    params={"query": CONTROL_ROOM_SNAPSHOT_QUERY},
                )
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise SanityRepositoryError("Failed to query Sanity snapshot") from exc

        payload = response.json()
        result = payload.get("result")
        snapshot = result if isinstance(result, dict) else {}

        _snapshot_cache = snapshot
        _snapshot_cache_time = _time.monotonic()

        return snapshot


def invalidate_snapshot_cache() -> None:
    global _snapshot_cache, _snapshot_cache_time
    _snapshot_cache = None
    _snapshot_cache_time = 0.0


def _normalize_vertical(value: str | None) -> str:
    if value in {"Estate", "Museum", "Collection"}:
        return value

    if value == "museum":
        return "Museum"
    if value == "collection":
        return "Collection"
    return "Estate"


def _normalize_workflow_status(value: str | None) -> str:
    if value in {"Active", "Pilot", "Needs Review"}:
        return value
    return "Pilot"


def _normalize_object_status(value: str | None) -> str:
    if value in {"Reviewed", "Needs Review", "Approved"}:
        return value
    return "Needs Review"


def _normalize_disposition(value: str | None) -> str:
    if value in {"Keep", "Sell", "Donate", "Archive"}:
        return value
    return "Keep"


def _normalize_priority_band(value: str | None) -> str:
    if value in {"High", "Medium", "Low"}:
        return value
    return "Medium"


def _normalize_space_mode(value: str | None) -> str:
    if value in {"estate", "museum", "inventory", "story"}:
        return value
    return "estate"


def _parse_timestamp(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)

    normalized = value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        return datetime.now(timezone.utc)


def _build_project_records(snapshot: dict) -> list[ProjectRecord]:
    spaces = snapshot.get("spaces") or []
    rooms = snapshot.get("rooms") or []
    objects = snapshot.get("objects") or []
    projects = snapshot.get("projects") or []

    rooms_by_space: dict[str, list[RoomRecord]] = {}
    objects_by_space: dict[str, list[ObjectRecord]] = {}

    for space in spaces:
        space_doc_id = space.get("_id", "")
        public_space_id = space.get("spaceId") or space_doc_id

        room_entries: list[RoomRecord] = []
        for room in rooms:
            if room.get("spaceRef") != space_doc_id:
                continue

            room_doc_id = room.get("_id", "")
            public_room_id = room.get("roomId") or room_doc_id
            room_objects = [
                object_record
                for object_record in objects
                if object_record.get("roomRef") == room_doc_id
            ]

            room_entries.append(
                RoomRecord(
                    id=public_room_id,
                    name=room.get("title") or public_room_id,
                    objectIds=[
                        object_record.get("objectId") or object_record.get("_id", "")
                        for object_record in room_objects
                    ],
                    pendingReviewCount=sum(
                        1
                        for object_record in room_objects
                        if object_record.get("status") == "Needs Review"
                    ),
                    priorityBand=_normalize_priority_band(room.get("priorityBand")),
                    recommendation=room.get("recommendation") or "",
                    summary=room.get("summary") or "",
                )
            )

        object_entries: list[ObjectRecord] = []
        for object_record in objects:
            if object_record.get("spaceRef") != space_doc_id:
                continue

            public_object_id = object_record.get("objectId") or object_record.get("_id", "")
            object_entries.append(
                ObjectRecord(
                    aiSummary=object_record.get("aiSummary") or "",
                    disposition=_normalize_disposition(object_record.get("disposition")),
                    id=public_object_id,
                    roomId=object_record.get("roomId") or object_record.get("roomRef") or "",
                    roomName=object_record.get("roomTitle") or "",
                    status=_normalize_object_status(object_record.get("status")),
                    title=object_record.get("title") or public_object_id,
                    type=object_record.get("objectType") or "Object",
                )
            )

        rooms_by_space[public_space_id] = room_entries
        objects_by_space[public_space_id] = object_entries

    project_entries: list[ProjectRecord] = []
    for project in projects:
        project_doc_id = project.get("_id", "")
        public_project_id = project.get("projectId") or project.get("slug") or project_doc_id

        space_entries: list[SpaceRecord] = []
        for space in spaces:
            if space.get("projectRef") != project_doc_id:
                continue

            public_space_id = space.get("spaceId") or space.get("_id", "")
            room_entries = rooms_by_space.get(public_space_id, [])
            object_entries = objects_by_space.get(public_space_id, [])

            approved_count = sum(1 for item in object_entries if item.status == "Approved")
            pending_review_count = sum(1 for item in object_entries if item.status == "Needs Review")
            reviewed_count = sum(1 for item in object_entries if item.status == "Reviewed")

            space_entries.append(
                SpaceRecord(
                    id=public_space_id,
                    matterportModelSid=space.get("matterportModelSid"),
                    mode=_normalize_space_mode(space.get("mode")),
                    name=space.get("title") or public_space_id,
                    objects=object_entries,
                    projectId=public_project_id,
                    projectName=project.get("title") or public_project_id,
                    rooms=room_entries,
                    summary=space.get("summary") or "",
                    workflow=WorkflowSummary(
                        approvedCount=approved_count,
                        pendingReviewCount=pending_review_count,
                        reviewedCount=reviewed_count,
                    ),
                )
            )

        project_entries.append(
            ProjectRecord(
                id=public_project_id,
                name=project.get("title") or public_project_id,
                spaces=space_entries,
                status=_normalize_workflow_status(project.get("status")),
                summary=project.get("summary") or "",
                vertical=_normalize_vertical(project.get("vertical")),
            )
        )

    return project_entries


def _build_project_summaries(projects: Sequence[ProjectRecord]) -> list[ProjectSummary]:
    return [
        ProjectSummary(
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
        for project in projects
    ]


def _build_audit_events(snapshot: dict) -> list[AuditEvent]:
    audit_events = snapshot.get("auditEvents") or []
    items: list[AuditEvent] = []

    for event in audit_events:
        items.append(
            AuditEvent(
                id=event.get("eventId") or event.get("_id", ""),
                action="object-updated",
                after=AuditDelta(
                    disposition=_normalize_disposition(event.get("afterDisposition")),
                    status=_normalize_object_status(event.get("afterStatus")),
                ),
                before=AuditDelta(
                    disposition=_normalize_disposition(event.get("beforeDisposition")),
                    status=_normalize_object_status(event.get("beforeStatus")),
                ),
                note=event.get("note"),
                objectId=event.get("objectId") or event.get("objectRef") or "",
                objectTitle=event.get("objectTitle") or event.get("objectId") or "",
                reviewer=event.get("reviewer") or "curatorial-operator",
                roomId=event.get("roomId") or event.get("roomRef") or "",
                roomName=event.get("roomTitle") or "",
                spaceId=event.get("spaceId") or event.get("spaceRef") or "",
                spaceName=event.get("spaceTitle") or "",
                timestamp=_parse_timestamp(event.get("eventTimestamp")),
            )
        )

    return items


def reset_repository_state() -> None:
    return None


def list_project_records() -> Sequence[ProjectRecord]:
    return _build_project_records(_fetch_snapshot())


def list_projects() -> Sequence[ProjectSummary]:
    return _build_project_summaries(list_project_records())


def get_project(project_id: str) -> ProjectSummary | None:
    return next((project for project in list_projects() if project.id == project_id), None)


def get_project_record(project_id: str) -> ProjectRecord | None:
    return next((project for project in list_project_records() if project.id == project_id), None)


def list_spaces(project_id: str) -> Sequence[SpaceSummary] | None:
    project = get_project(project_id)
    if project is None:
        return None
    return project.spaces


def get_space(space_id: str) -> SpaceRecord | None:
    return next(
        (space for project in list_project_records() for space in project.spaces if space.id == space_id),
        None,
    )


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

    for project in list_project_records():
        for space in project.spaces:
            if space_id is not None and space.id != space_id:
                continue

            room_lookup = {room.id: room for room in space.rooms}
            for object_record in space.objects:
                if object_record.status != "Needs Review":
                    continue

                room = room_lookup.get(object_record.room_id)
                items.append(
                    ReviewQueueItem(
                        disposition=object_record.disposition,
                        objectId=object_record.id,
                        objectTitle=object_record.title,
                        priorityBand=room.priority_band if room else "Medium",
                        projectId=project.id,
                        projectName=project.name,
                        roomId=object_record.room_id,
                        roomName=object_record.room_name,
                        spaceId=space.id,
                        spaceName=space.name,
                        status=object_record.status,
                    )
                )

    return items


def list_audit_events(space_id: str | None = None) -> Sequence[AuditEvent]:
    items = _build_audit_events(_fetch_snapshot())

    if space_id is None:
        return items

    return [event for event in items if event.space_id == space_id]


def update_object_workflow(
    space_id: str, object_id: str, change: ObjectWorkflowUpdateRequest
) -> tuple[ObjectRecord, WorkflowSummary, AuditEvent] | None:
    snapshot = _fetch_snapshot()
    spaces = snapshot.get("spaces") or []
    rooms = snapshot.get("rooms") or []
    objects = snapshot.get("objects") or []

    raw_space = next(
        (
            space
            for space in spaces
            if space.get("spaceId") == space_id or space.get("_id") == space_id
        ),
        None,
    )
    if raw_space is None:
        return None

    raw_object = next(
        (
            object_record
            for object_record in objects
            if (
                object_record.get("spaceRef") == raw_space.get("_id")
                and (object_record.get("objectId") == object_id or object_record.get("_id") == object_id)
            )
        ),
        None,
    )
    if raw_object is None:
        return None

    room_doc_id = raw_object.get("roomRef")
    raw_room = next((room for room in rooms if room.get("_id") == room_doc_id), None)

    before = AuditDelta(
        disposition=_normalize_disposition(raw_object.get("disposition")),
        status=_normalize_object_status(raw_object.get("status")),
    )
    next_status = change.status or ("Reviewed" if before.status == "Needs Review" else before.status)

    patch_fields: dict[str, str] = {
        "disposition": change.disposition or before.disposition,
        "status": next_status,
    }

    if change.title is not None:
        patch_fields["title"] = change.title
    if change.type is not None:
        patch_fields["objectType"] = change.type
    if change.ai_summary is not None:
        patch_fields["aiSummary"] = change.ai_summary
    if change.note is not None:
        patch_fields["operatorNote"] = change.note

    event_id = f"audit_{uuid4().hex[:12]}"
    timestamp = datetime.now(timezone.utc)
    audit_document = {
        "_id": event_id,
        "_type": "workflowAuditEvent",
        "afterDisposition": patch_fields["disposition"],
        "afterStatus": next_status,
        "beforeDisposition": before.disposition,
        "beforeStatus": before.status,
        "eventId": event_id,
        "eventTimestamp": timestamp.isoformat().replace("+00:00", "Z"),
        "object": {"_type": "reference", "_ref": raw_object.get("_id", "")},
        "reviewer": change.reviewer,
        "space": {"_type": "reference", "_ref": raw_space.get("_id", "")},
    }
    if change.note is not None:
        audit_document["note"] = change.note
    if raw_room is not None:
        audit_document["room"] = {"_type": "reference", "_ref": raw_room.get("_id", "")}

    mutations = {
        "mutations": [
            {
                "patch": {
                    "id": raw_object.get("_id", ""),
                    "ifRevisionID": raw_object.get("_rev"),
                    "set": patch_fields,
                }
            },
            {"create": audit_document},
        ],
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                _build_mutation_url(),
                params={"visibility": "sync"},
                headers=_build_write_headers(),
                json=mutations,
            )
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise SanityRepositoryError("Failed to persist workflow update to Sanity") from exc

    invalidate_snapshot_cache()

    updated_space = get_space(space_id)
    updated_object = get_object(space_id, object_id)
    if updated_space is None or updated_object is None:
        return None

    room_name = updated_object.room_name
    room_id = updated_object.room_id
    if raw_room is not None:
        room_name = raw_room.get("title") or room_name
        room_id = raw_room.get("roomId") or room_id

    audit_event = AuditEvent(
        id=event_id,
        action="object-updated",
        after=AuditDelta(
            disposition=updated_object.disposition,
            status=updated_object.status,
        ),
        before=before,
        note=change.note,
        objectId=updated_object.id,
        objectTitle=updated_object.title,
        reviewer=change.reviewer,
        roomId=room_id,
        roomName=room_name,
        spaceId=updated_space.id,
        spaceName=updated_space.name,
        timestamp=timestamp,
    )

    return updated_object, updated_space.workflow, audit_event
