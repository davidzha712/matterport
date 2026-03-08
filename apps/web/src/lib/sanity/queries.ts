import { defineQuery } from "next-sanity"

export const controlRoomSnapshotQuery = defineQuery(`{
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
    objectId,
    title,
    objectType,
    status,
    disposition,
    aiSummary,
    operatorNote,
    sortOrder,
    anchorPosition,
    "spaceRef": space->_id,
    "roomRef": room->_id,
    "roomTitle": room->title,
    "roomId": coalesce(room->roomId, room->_id)
  },
  "providerProfiles": *[_type == "aiProviderProfile"] | order(title asc){
    _id,
    providerId,
    title,
    status,
    preferredFor,
    configured,
    specialty,
    fallbackClass,
    notes
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
}`)
