import { act, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ContextPanel } from "../src/components/context-panel"
import { LocaleProvider } from "../src/lib/i18n"
import { getSpaceById } from "../src/lib/mock-data"

const testSpace = getSpaceById("orchard-main-house")!

const testApiObjects = [
  {
    id: "walnut-cabinet",
    title: "Walnut Cabinet",
    type: "Furniture",
    status: "Needs Review" as const,
    disposition: "Sell" as const,
    roomId: "living-room",
    roomName: "Living Room",
    spaceId: "orchard-main-house",
    aiSummary: "Wahrscheinlich ein Aufbewahrungsschrank.",
  },
  {
    id: "mantel-clock",
    title: "Mantel Clock",
    type: "Decor",
    status: "Reviewed" as const,
    disposition: "Keep" as const,
    roomId: "living-room",
    roomName: "Living Room",
    spaceId: "orchard-main-house",
    aiSummary: "Die Kaminuhr wirkt dekorativ.",
  },
]

const bridgeStub = {
  getAnnotations: vi.fn(() => [
    {
      createdBy: "ai" as const,
      id: "ann-2",
      label: "Mantel Clock",
      objectId: "mantel-clock",
      position: { x: 0, y: 0, z: 0 },
    },
  ]),
  navigateToRoom: vi.fn(),
}

vi.mock("../src/lib/bridge-context", () => ({
  useBridge: () => ({
    bridge: bridgeStub,
    currentRoom: { id: "living-room", name: "Living Room" },
    sdkRooms: [],
    status: "sdk-connected" as const,
  }),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

describe("ContextPanel", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("promotes the clicked tag object into the main workflow card", async () => {
    render(
      <LocaleProvider>
        <ContextPanel
          apiObjects={testApiObjects}
          panelConfig={{
            aiDetections: true,
            commandBar: true,
            leftPanel: true,
            objectWorkflowCard: true,
            rightPanel: true,
            workflowSidebar: true,
          }}
          providers={[]}
          showReviewCounts
          space={testSpace}
        />
      </LocaleProvider>,
    )

    expect(screen.getByRole("heading", { name: /walnut cabinet/i })).toBeInTheDocument()

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent("annotation-tag-clicked", { detail: { annotationId: "ann-2" } }),
      )
    })

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /mantel clock/i })).toBeInTheDocument()
    })
  })
})
