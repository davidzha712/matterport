import "server-only"

import {
  getObjectById as getFallbackObjectById,
  getProjects as getFallbackProjects,
  getReviewQueue as getFallbackReviewQueue,
  getRoomById as getFallbackRoomById,
  getSpaceById as getFallbackSpaceById,
  type ObjectRecord,
  type ProjectRecord,
  type ReviewQueueItem,
  type RoomRecord,
  type SpaceRecord,
} from "@/lib/mock-data"

type ProjectCatalogResponse = {
  items: ProjectRecord[]
}

type ReviewQueueResponse = {
  items: ReviewQueueItem[]
}

function resolveServerApiBaseUrl() {
  return process.env.MATTERPORT_PLATFORM_API_URL ?? "http://127.0.0.1:8000"
}

async function fetchApi<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${resolveServerApiBaseUrl()}${path}`, {
      cache: "no-store",
    })

    if (!response.ok) {
      return null
    }

    return (await response.json()) as T
  } catch {
    return null
  }
}

export async function getRuntimeProjects() {
  const payload = await fetchApi<ProjectCatalogResponse>("/api/v1/projects/catalog")
  return payload?.items ?? getFallbackProjects()
}

export async function getRuntimeSpace(spaceId: string) {
  const payload = await fetchApi<SpaceRecord>(`/api/v1/spaces/${spaceId}`)
  return payload ?? getFallbackSpaceById(spaceId)
}

export async function getRuntimeReviewQueue() {
  const payload = await fetchApi<ReviewQueueResponse>("/api/v1/workflows/review-queue")
  return payload?.items ?? getFallbackReviewQueue()
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
    objectRecord: space.objects.find((objectRecord) => objectRecord.id === objectId) ??
      getFallbackObjectById(spaceId, objectId),
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
    room: space.rooms.find((room) => room.id === roomId) ?? getFallbackRoomById(spaceId, roomId),
    space,
  }
}
