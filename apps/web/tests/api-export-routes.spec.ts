import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import type { ObjectRecord, ProjectRecord, SpaceRecord } from "../src/lib/platform-types"

vi.mock("server-only", () => ({}))

const platformServiceMocks = vi.hoisted(() => ({
  getRuntimeProjects: vi.fn(),
  getRuntimeSpace: vi.fn(),
}))

vi.mock("@/lib/platform-service", () => ({
  getRuntimeProjects: platformServiceMocks.getRuntimeProjects,
  getRuntimeSpace: platformServiceMocks.getRuntimeSpace,
}))

import { GET as getAllCsv } from "../src/app/api/export/all/csv/route"
import { GET as getSpaceCsv } from "../src/app/api/export/spaces/[spaceId]/csv/route"
import { GET as getIiifManifest } from "../src/app/api/export/spaces/[spaceId]/iiif-manifest/route"

function createObject(overrides: Partial<ObjectRecord> = {}): ObjectRecord {
  return {
    aiSummary: "Detected",
    disposition: "Keep",
    id: "obj-1",
    roomId: "room-1",
    roomName: "Gallery",
    spaceId: "space-1",
    status: "Approved",
    title: "Cabinet",
    type: "Furniture",
    ...overrides,
  }
}

function createSpace(objects: ObjectRecord[], overrides: Partial<SpaceRecord> = {}): SpaceRecord {
  return {
    id: "space-1",
    name: "North Gallery",
    objects,
    projectId: "project-1",
    projectName: "Museum",
    rooms: [
      {
        id: "room-1",
        name: "Gallery",
        objectIds: objects.map((objectRecord) => objectRecord.id),
        pendingReviewCount: objects.filter((objectRecord) => objectRecord.status === "Needs Review").length,
        priorityBand: "Medium",
        recommendation: "",
        summary: "",
      },
    ],
    summary: "Curated collection",
    workflow: {
      approvedCount: objects.filter((objectRecord) => objectRecord.status === "Approved").length,
      pendingReviewCount: objects.filter((objectRecord) => objectRecord.status === "Needs Review").length,
      reviewedCount: objects.filter((objectRecord) => objectRecord.status === "Reviewed").length,
    },
    ...overrides,
  }
}

function createProject(space: SpaceRecord): ProjectRecord {
  return {
    id: "project-1",
    name: "Museum",
    spaces: [space],
    status: "Active",
    summary: "Summary",
    vertical: "Museum",
  }
}

describe("/api/export routes", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("blocks global strict export when a composite space still has pending review", async () => {
    platformServiceMocks.getRuntimeProjects.mockResolvedValue([
      createProject(createSpace([createObject({ status: "Needs Review" })])),
    ])

    const response = await getAllCsv(
      new NextRequest("http://localhost/api/export/all/csv?strict=true"),
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      detail: "Global export blocked until every space is export-ready",
    })
  })

  it("exports strict space CSV from the runtime composite source", async () => {
    platformServiceMocks.getRuntimeSpace.mockResolvedValue(
      createSpace([createObject({ title: "=Formula Cabinet" })]),
    )

    const response = await getSpaceCsv(
      new NextRequest("http://localhost/api/export/spaces/space-1/csv?strict=true"),
      { params: Promise.resolve({ spaceId: "space-1" }) },
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("content-disposition")).toContain("space_space-1_objects.csv")
    await expect(response.text()).resolves.toContain("'=Formula Cabinet")
  })

  it("builds iiif manifest payloads from the runtime composite source", async () => {
    platformServiceMocks.getRuntimeSpace.mockResolvedValue(
      createSpace([createObject({ title: "Visitor Map" })]),
    )

    const response = await getIiifManifest(
      new NextRequest("http://localhost/api/export/spaces/space-1/iiif-manifest?strict=true"),
      { params: Promise.resolve({ spaceId: "space-1" }) },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      label: { en: ["North Gallery"] },
      type: "Manifest",
    })
  })
})
