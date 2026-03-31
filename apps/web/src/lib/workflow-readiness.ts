import type { ObjectRecord, SpaceRecord } from "@/lib/platform-types"

export type WorkflowBlockerCode = "no-objects" | "pending-review" | "no-approved-objects"

export type RoomChecklistItem = {
  id: string
  name: string
  objectCount: number
  pendingReviewCount: number
  ready: boolean
}

export type WorkflowReadiness = {
  approvedCount: number
  blockers: WorkflowBlockerCode[]
  exportReady: boolean
  pendingReviewCount: number
  publishReady: boolean
  readyCount: number
  reviewedCount: number
  roomChecklist: RoomChecklistItem[]
  shareReady: boolean
  totalObjects: number
}

export function getWorkflowReadiness(
  space: Pick<SpaceRecord, "rooms" | "objects">,
  objectOverride?: ObjectRecord[],
): WorkflowReadiness {
  const objects = objectOverride ?? space.objects
  const totalObjects = objects.length
  const approvedCount = objects.filter((objectRecord) => objectRecord.status === "Approved").length
  const reviewedCount = objects.filter((objectRecord) => objectRecord.status === "Reviewed").length
  const pendingReviewCount = objects.filter((objectRecord) => objectRecord.status === "Needs Review").length
  const readyCount = approvedCount + reviewedCount

  const roomChecklist = space.rooms.map((room) => {
    const roomObjects = objects.filter(
      (objectRecord) =>
        objectRecord.roomId === room.id ||
        objectRecord.roomName?.toLowerCase() === room.name.toLowerCase(),
    )
    const roomPendingReviewCount = roomObjects.filter(
      (objectRecord) => objectRecord.status === "Needs Review",
    ).length

    return {
      id: room.id,
      name: room.name,
      objectCount: roomObjects.length,
      pendingReviewCount: roomPendingReviewCount,
      ready: roomObjects.length > 0 && roomPendingReviewCount === 0,
    }
  })

  const blockers: WorkflowBlockerCode[] = []
  if (totalObjects === 0) {
    blockers.push("no-objects")
  }
  if (pendingReviewCount > 0) {
    blockers.push("pending-review")
  }
  if (approvedCount === 0) {
    blockers.push("no-approved-objects")
  }

  const exportReady = totalObjects > 0 && pendingReviewCount === 0
  const publishReady = exportReady && approvedCount > 0
  const shareReady = publishReady

  return {
    approvedCount,
    blockers,
    exportReady,
    pendingReviewCount,
    publishReady,
    readyCount,
    reviewedCount,
    roomChecklist,
    shareReady,
    totalObjects,
  }
}
