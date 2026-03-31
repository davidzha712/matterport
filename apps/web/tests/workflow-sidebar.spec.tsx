import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { WorkflowSidebar } from "../src/components/workflow-sidebar"
import { LocaleProvider } from "../src/lib/i18n"
import type { WorkflowReadiness } from "../src/lib/workflow-readiness"

const readiness: WorkflowReadiness = {
  approvedCount: 1,
  blockers: [],
  exportReady: true,
  pendingReviewCount: 0,
  publishReady: true,
  readyCount: 2,
  reviewedCount: 1,
  roomChecklist: [
    {
      id: "room-1",
      name: "Living Room",
      objectCount: 2,
      pendingReviewCount: 0,
      ready: true,
    },
  ],
  shareReady: true,
  totalObjects: 2,
}

describe("WorkflowSidebar", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("keeps the open decisions queue visible when audit log loading fails", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [
              {
                disposition: "Keep",
                objectId: "obj-1",
                objectTitle: "Walnut Cabinet",
                priorityBand: "High",
                roomName: "Living Room",
                status: "Needs Review",
              },
            ],
          }),
          {
            headers: { "Content-Type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockRejectedValueOnce(new Error("Failed to fetch"))

    render(
      <LocaleProvider>
        <WorkflowSidebar
          providers={[]}
          readiness={readiness}
          spaceId="orchard-main-house"
        />
      </LocaleProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/walnut cabinet/i)).toBeInTheDocument()
    })

    expect(screen.queryByText(/workflow-daten konnten nicht geladen werden/i)).not.toBeInTheDocument()
  })
})
