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
} from "@/lib/mock-data"
import { mergeObjectCollections, readObjectStore } from "@/lib/object-store"
import { isSanityConfigured, sanityClient } from "@/lib/sanity/client"
import {
  mapSnapshotToProjects,
  type SanitySnapshot,
} from "@/lib/sanity/mappers"
import { controlRoomSnapshotQuery } from "@/lib/sanity/queries"

const getSanitySnapshot = cache(async (): Promise<SanitySnapshot | null> => {
  if (!isSanityConfigured()) {
    return null
  }

  try {
    return await sanityClient.fetch<SanitySnapshot>(controlRoomSnapshotQuery, {},
      { signal: AbortSignal.timeout(4000) }
    )
  } catch {
    return null
  }
})

function buildWorkflowSummary(objects: ObjectRecord[]): SpaceRecord["workflow"] {
  return {
    approvedCount: objects.filter((objectRecord) => objectRecord.status === "Approved").length,
    pendingReviewCount: objects.filter((objectRecord) => objectRecord.status === "Needs Review").length,
    reviewedCount: objects.filter((objectRecord) => objectRecord.status === "Reviewed").length,
  }
}

function hydrateSpaceWithLocalObjects(space: SpaceRecord, persistedObjects: ObjectRecord[]): SpaceRecord {
  const spaceObjects = persistedObjects.filter((objectRecord) => objectRecord.spaceId === space.id)
  const objects = mergeObjectCollections(space.objects, spaceObjects)
  const rooms = space.rooms.map((room) => {
    const roomObjects = objects.filter(
      (objectRecord) =>
        objectRecord.roomId === room.id ||
        objectRecord.roomName?.toLowerCase() === room.name.toLowerCase()
    )

    return {
      ...room,
      objectIds: roomObjects.map((objectRecord) => objectRecord.id),
      pendingReviewCount: roomObjects.filter((objectRecord) => objectRecord.status === "Needs Review").length,
    }
  })

  return {
    ...space,
    objects,
    rooms,
    workflow: buildWorkflowSummary(objects),
  }
}

function hydrateProjectsWithLocalObjects(projects: ProjectRecord[]): ProjectRecord[] {
  const persistedObjects = readObjectStore().objects

  return projects.map((project) => ({
    ...project,
    spaces: project.spaces.map((space) => hydrateSpaceWithLocalObjects(space, persistedObjects)),
  }))
}

function buildReviewQueueFromProjects(projects: ProjectRecord[]): ReviewQueueItem[] {
  return projects.flatMap((project) =>
    project.spaces.flatMap((space) => {
      const roomLookup = new Map(space.rooms.map((room) => [room.id, room]))

      return space.objects
        .filter((objectRecord) => objectRecord.status === "Needs Review")
        .map((objectRecord) => {
          const room = roomLookup.get(objectRecord.roomId)

          return {
            disposition: objectRecord.disposition,
            objectId: objectRecord.id,
            objectTitle: objectRecord.title,
            priorityBand: room?.priorityBand ?? "Medium",
            projectId: project.id,
            projectName: project.name,
            roomId: objectRecord.roomId,
            roomName: objectRecord.roomName,
            spaceId: space.id,
            spaceName: space.name,
            status: objectRecord.status,
          }
        })
    }),
  )
}

export async function getRuntimeProjects(): Promise<ProjectRecord[]> {
  const snapshot = await getSanitySnapshot()
  const projects = snapshot ? mapSnapshotToProjects(snapshot) : []
  const runtimeProjects = projects.length > 0 ? projects : getMockProjects()
  return hydrateProjectsWithLocalObjects(runtimeProjects)
}

export async function getRuntimeSpace(spaceId: string): Promise<SpaceRecord | undefined> {
  const projects = await getRuntimeProjects()

  for (const project of projects) {
    const space = project.spaces.find((candidate) => candidate.id === spaceId)
    if (space) {
      return space
    }
  }

  return undefined
}

export async function getRuntimeReviewQueue(): Promise<ReviewQueueItem[]> {
  const projects = await getRuntimeProjects()
  return buildReviewQueueFromProjects(projects)
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
