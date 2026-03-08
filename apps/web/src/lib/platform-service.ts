import "server-only"

import { cache } from "react"
import type {
  ObjectRecord,
  ProjectRecord,
  ReviewQueueItem,
  RoomRecord,
  SpaceRecord,
} from "@/lib/platform-types"
import { isSanityConfigured, sanityClient } from "@/lib/sanity/client"
import {
  mapSnapshotToProjects,
  mapSnapshotToReviewQueue,
  mapSnapshotToSpace,
  type SanitySnapshot,
} from "@/lib/sanity/mappers"
import { controlRoomSnapshotQuery } from "@/lib/sanity/queries"

const getSanitySnapshot = cache(async (): Promise<SanitySnapshot | null> => {
  if (!isSanityConfigured()) {
    return null
  }

  try {
    return await sanityClient.fetch<SanitySnapshot>(controlRoomSnapshotQuery)
  } catch {
    return null
  }
})

export async function getRuntimeProjects(): Promise<ProjectRecord[]> {
  const snapshot = await getSanitySnapshot()
  return snapshot ? mapSnapshotToProjects(snapshot) : []
}

export async function getRuntimeSpace(spaceId: string): Promise<SpaceRecord | undefined> {
  const snapshot = await getSanitySnapshot()
  return snapshot ? mapSnapshotToSpace(snapshot, spaceId) : undefined
}

export async function getRuntimeReviewQueue(): Promise<ReviewQueueItem[]> {
  const snapshot = await getSanitySnapshot()
  return snapshot ? mapSnapshotToReviewQueue(snapshot) : []
}

export async function getRuntimeObject(spaceId: string, objectId: string): Promise<{
  objectRecord?: ObjectRecord
  space?: SpaceRecord
}> {
  const space = await getRuntimeSpace(spaceId)

  if (!space) {
    return {}
  }

  return {
    objectRecord: space.objects.find((objectRecord) => objectRecord.id === objectId),
    space,
  }
}

export async function getRuntimeRoom(spaceId: string, roomId: string): Promise<{
  room?: RoomRecord
  space?: SpaceRecord
}> {
  const space = await getRuntimeSpace(spaceId)

  if (!space) {
    return {}
  }

  return {
    room: space.rooms.find((room) => room.id === roomId),
    space,
  }
}
