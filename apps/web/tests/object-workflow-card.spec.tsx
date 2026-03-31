import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ObjectWorkflowCard } from "../src/components/object-workflow-card"
import { LocaleProvider } from "../src/lib/i18n"

const refreshMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}))

const testObject = {
  id: "walnut-cabinet",
  title: "Walnut Cabinet",
  type: "Furniture",
  status: "Needs Review" as const,
  disposition: "Sell" as const,
  roomId: "living-room",
  roomName: "Living Room",
  spaceId: "orchard-main-house",
  aiSummary: "Wahrscheinlich ein Aufbewahrungsschrank des fruehen 20. Jahrhunderts.",
}

const nextObject = {
  id: "mantel-clock",
  title: "Mantel Clock",
  type: "Decor",
  status: "Reviewed" as const,
  disposition: "Keep" as const,
  roomId: "living-room",
  roomName: "Living Room",
  spaceId: "orchard-main-house",
  aiSummary: "Die Kaminuhr wirkt dekorativ.",
}

function renderObjectWorkflowCard() {
  return render(
    <LocaleProvider>
      <ObjectWorkflowCard
        objectRecord={testObject!}
        objectRoute="/spaces/orchard-main-house/objects/walnut-cabinet"
        spaceId="orchard-main-house"
      />
    </LocaleProvider>
  )
}

describe("ObjectWorkflowCard", () => {
  afterEach(() => {
    refreshMock.mockReset()
    vi.restoreAllMocks()
  })

  it("patches the selected object and shows workflow feedback", async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            auditEvent: {
              id: "audit_123",
            },
            objectRecord: {
              ...testObject,
              disposition: "Keep",
              status: "Reviewed",
            },
            workflow: {
              approvedCount: 1,
              pendingReviewCount: 1,
              reviewedCount: 2,
            },
          }),
          {
            headers: {
              "Content-Type": "application/json",
            },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            object: {
              ...testObject,
              disposition: "Keep",
              status: "Reviewed",
            },
          }),
          {
            headers: {
              "Content-Type": "application/json",
            },
            status: 200,
          },
        ),
      )

    renderObjectWorkflowCard()

    await user.type(
      screen.getByRole("textbox", { name: /audit-notiz/i }),
      "Familienentscheidung dokumentiert",
    )
    await user.click(screen.getByRole("button", { name: /behalten/i }))

    await waitFor(() => {
      expect(screen.getByText(/Behalten gespeichert/i)).toBeInTheDocument()
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(/spaces\/orchard-main-house\/objects\/walnut-cabinet$/)
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "PATCH" })
    expect(fetchMock.mock.calls[1]?.[0]).toMatch(/\/api\/objects$/)
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: "PATCH" })
    expect(refreshMock).toHaveBeenCalledTimes(1)
  })

  it("syncs its visible object card when the selected object prop changes", () => {
    const view = renderObjectWorkflowCard()

    expect(screen.getByRole("heading", { name: /walnut cabinet/i })).toBeInTheDocument()
    expect(screen.getByText(/living room/i)).toBeInTheDocument()

    view.rerender(
      <LocaleProvider>
        <ObjectWorkflowCard
          objectRecord={nextObject!}
          objectRoute="/spaces/orchard-main-house/objects/mantel-clock"
          spaceId="orchard-main-house"
        />
      </LocaleProvider>
    )

    expect(screen.getByRole("heading", { name: /mantel clock/i })).toBeInTheDocument()
    expect(screen.getByText(/geprueft/i)).toBeInTheDocument()
    expect(screen.getAllByText(/behalten/i).length).toBeGreaterThan(0)
  })
})
