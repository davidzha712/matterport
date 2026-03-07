from fastapi import APIRouter, HTTPException

from app.models import (
    ObjectListResponse,
    ObjectRecord,
    ObjectWorkflowUpdateRequest,
    ObjectWorkflowUpdateResponse,
    RoomListResponse,
    RoomRecord,
    SpaceRecord,
)
from app.repository import (
    get_object,
    get_room,
    get_space,
    list_objects,
    list_rooms,
    update_object_workflow,
)

router = APIRouter(prefix="/spaces", tags=["spaces"])


@router.get("/{space_id}", response_model=SpaceRecord)
def get_space_by_id(space_id: str) -> SpaceRecord:
    space = get_space(space_id)
    if space is None:
        raise HTTPException(status_code=404, detail="Space not found")
    return space


@router.get("/{space_id}/rooms", response_model=RoomListResponse)
def get_space_rooms(space_id: str) -> RoomListResponse:
    rooms = list_rooms(space_id)
    if rooms is None:
        raise HTTPException(status_code=404, detail="Space not found")
    return RoomListResponse(items=list(rooms))


@router.get("/{space_id}/rooms/{room_id}", response_model=RoomRecord)
def get_space_room(space_id: str, room_id: str) -> RoomRecord:
    room = get_room(space_id, room_id)
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


@router.get("/{space_id}/objects", response_model=ObjectListResponse)
def get_space_objects(space_id: str) -> ObjectListResponse:
    objects = list_objects(space_id)
    if objects is None:
        raise HTTPException(status_code=404, detail="Space not found")
    return ObjectListResponse(items=list(objects))


@router.get("/{space_id}/objects/{object_id}", response_model=ObjectRecord)
def get_space_object(space_id: str, object_id: str) -> ObjectRecord:
    object_record = get_object(space_id, object_id)
    if object_record is None:
        raise HTTPException(status_code=404, detail="Object not found")
    return object_record


@router.patch("/{space_id}/objects/{object_id}", response_model=ObjectWorkflowUpdateResponse)
def patch_space_object(
    space_id: str, object_id: str, payload: ObjectWorkflowUpdateRequest
) -> ObjectWorkflowUpdateResponse:
    result = update_object_workflow(space_id, object_id, payload)
    if result is None:
        raise HTTPException(status_code=404, detail="Object not found")

    object_record, workflow, audit_event = result
    return ObjectWorkflowUpdateResponse(
        auditEvent=audit_event,
        objectRecord=object_record,
        workflow=workflow,
    )
