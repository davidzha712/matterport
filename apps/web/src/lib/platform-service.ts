import "server-only"

import { cache } from "react"
import type {
  ObjectRecord,
  ProjectRecord,
  ReviewQueueItem,
  RoomRecord,
  SpaceRecord,
} from "@/lib/platform-types"
import {
  getProjects as getMockProjects,
  getProviderProfiles as getMockProviders,
  getReviewQueue as getMockReviewQueue,
  getSpaceById as getMockSpace,
} from "@/lib/mock-data"
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
  const projects = snapshot ? mapSnapshotToProjects(snapshot) : []
  return projects.length > 0 ? projects : getMockProjects()
}

export async function getRuntimeSpace(spaceId: string): Promise<SpaceRecord | undefined> {
  const snapshot = await getSanitySnapshot()
  const space = snapshot ? mapSnapshotToSpace(snapshot, spaceId) : undefined
  return space ?? getMockSpace(spaceId)
}

export async function getRuntimeReviewQueue(): Promise<ReviewQueueItem[]> {
  const snapshot = await getSanitySnapshot()
  const queue = snapshot ? mapSnapshotToReviewQueue(snapshot) : []
  return queue.length > 0 ? queue : getMockReviewQueue()
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
