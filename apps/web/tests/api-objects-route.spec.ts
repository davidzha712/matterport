import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import type { ObjectRecord, ProjectRecord, SpaceRecord } from "../src/lib/platform-types"

const objectStoreMocks = vi.hoisted(() => ({
  readObjectStore: vi.fn(),
  writeObjectStore: vi.fn(),
}))

const platformServiceMocks = vi.hoisted(() => ({
  getRuntimeProjects: vi.fn(),
  getRuntimeSpace: vi.fn(),
}))

vi.mock("@/lib/object-store", () => ({
  readObjectStore: objectStoreMocks.readObjectStore,
  writeObjectStore: objectStoreMocks.writeObjectStore,
}))

vi.mock("@/lib/platform-service", () => ({
  getRuntimeProjects: platformServiceMocks.getRuntimeProjects,
  getRuntimeSpace: platformServiceMocks.getRuntimeSpace,
}))

import { GET, PATCH, POST } from "../src/app/api/objects/route"

function createObject(overrides: Partial<ObjectRecord> = {}): ObjectRecord {
  return {
    aiSummary: "Detected",
    disposition: "Keep",
    id: "obj-1",
    roomId: "room-1",
    roomName: "Living Room",
    spaceId: "space-1",
    status: "Needs Review",
    title: "Cabinet",
    type: "Furniture",
    ...overrides,
  }
}

function createSpace(objects: ObjectRecord[]): SpaceRecord {
  return {
    id: "space-1",
    name: "Main House",
    objects,
    projectId: "project-1",
    projectName: "Estate",
    rooms: [
      {
        id: "room-1",
        name: "Living Room",
        objectIds: objects.filter((objectRecord) => objectRecord.roomId === "room-1").map((objectRecord) => objectRecord.id),
        pendingReviewCount: objects.filter((objectRecord) => objectRecord.roomId === "room-1" && objectRecord.status === "Needs Review").length,
        priorityBand: "Medium",
        recommendation: "",
        summary: "",
      },
    ],
    summary: "Summary",
    workflow: {
      approvedCount: objects.filter((objectRecord) => objectRecord.status === "Approved").length,
      pendingReviewCount: objects.filter((objectRecord) => objectRecord.status === "Needs Review").length,
      reviewedCount: objects.filter((objectRecord) => objectRecord.status === "Reviewed").length,
    },
  }
}

function createProject(space: SpaceRecord): ProjectRecord {
  return {
    id: "project-1",
    name: "Estate",
    spaces: [space],
    status: "Active",
    summary: "Summary",
    vertical: "Estate",
  }
}

describe("/api/objects route", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("filters composite objects by room when a space is provided", async () => {
    const roomObject = createObject({ id: "obj-room", roomId: "room-1", roomName: "Living Room" })
    const otherRoomObject = createObject({ id: "obj-other", roomId: "room-2", roomName: "Kitchen" })
    platformServiceMocks.getRuntimeSpace.mockResolvedValue(createSpace([roomObject, otherRoomObject]))

    const response = await GET(
      new NextRequest("http://localhost/api/objects?spaceId=space-1&roomId=room-1"),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      objects: [roomObject],
    })
  })

  it("creates a local overlay when patching an object that exists only in the composite source", async () => {
    const baseObject = createObject({ id: "base-1", title: "Original Cabinet" })
    const space = createSpace([baseObject])
    objectStoreMocks.readObjectStore.mockReturnValue({ objects: [], updatedAt: "2026-03-11T00:00:00.000Z" })
    platformServiceMocks.getRuntimeProjects.mockResolvedValue([createProject(space)])

    const response = await PATCH(
      new NextRequest("http://localhost/api/objects", {
        body: JSON.stringify({
          id: "base-1",
          title: "Revised Cabinet",
        }),
        method: "PATCH",
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      object: {
        id: "base-1",
        title: "Revised Cabinet",
      },
    })
    expect(objectStoreMocks.writeObjectStore).toHaveBeenCalledTimes(1)
    expect(objectStoreMocks.writeObjectStore).toHaveBeenCalledWith({
      objects: [
        expect.objectContaining({
          id: "base-1",
          title: "Revised Cabinet",
        }),
      ],
      updatedAt: "2026-03-11T00:00:00.000Z",
    })
  })

  it("rejects creates without a title and spaceId", async () => {
    objectStoreMocks.readObjectStore.mockReturnValue({ objects: [], updatedAt: "2026-03-11T00:00:00.000Z" })

    const response = await POST(
      new NextRequest("http://localhost/api/objects", {
        body: JSON.stringify({
          object: {
            title: "Orphan object",
          },
        }),
        method: "POST",
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      detail: "Objects require at least a title and spaceId",
    })
    expect(objectStoreMocks.writeObjectStore).not.toHaveBeenCalled()
  })

  it("preserves captured photos when creating detected objects", async () => {
    objectStoreMocks.readObjectStore.mockReturnValue({ objects: [], updatedAt: "2026-03-11T00:00:00.000Z" })

    const response = await POST(
      new NextRequest("http://localhost/api/objects", {
        body: JSON.stringify({
          object: {
            photos: [
              {
                id: "photo-1",
                url: "data:image/png;base64,abc123",
                createdAt: "2026-03-11T10:00:00.000Z",
              },
            ],
            roomId: "room-1",
            roomName: "Living Room",
            spaceId: "space-1",
            title: "Detected Cabinet",
            type: "Furniture",
          },
        }),
        method: "POST",
      }),
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toMatchObject({
      created: [
        {
          photos: [
            {
              id: "photo-1",
              url: "data:image/png;base64,abc123",
            },
          ],
          title: "Detected Cabinet",
        },
      ],
    })
  })
})
