import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const platformServiceMocks = vi.hoisted(() => ({
  getRuntimeReviewQueue: vi.fn(),
}))

vi.mock("@/lib/platform-service", () => ({
  getRuntimeReviewQueue: platformServiceMocks.getRuntimeReviewQueue,
}))

import { GET } from "../src/app/api/workflows/review-queue/route"

describe("/api/workflows/review-queue route", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("filters composite review queue items by space id", async () => {
    platformServiceMocks.getRuntimeReviewQueue.mockResolvedValue([
      {
        disposition: "Keep",
        objectId: "obj-1",
        objectTitle: "Cabinet",
        priorityBand: "High",
        projectId: "project-1",
        projectName: "Estate",
        roomId: "room-1",
        roomName: "Living Room",
        spaceId: "space-1",
        spaceName: "Main House",
        status: "Needs Review",
      },
      {
        disposition: "Archive",
        objectId: "obj-2",
        objectTitle: "Archive Box",
        priorityBand: "Low",
        projectId: "project-1",
        projectName: "Estate",
        roomId: "room-2",
        roomName: "Study",
        spaceId: "space-2",
        spaceName: "Studio",
        status: "Needs Review",
      },
    ])

    const response = await GET(
      new NextRequest("http://localhost/api/workflows/review-queue?spaceId=space-1"),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      items: [
        expect.objectContaining({
          objectId: "obj-1",
          spaceId: "space-1",
        }),
      ],
    })
  })
})
