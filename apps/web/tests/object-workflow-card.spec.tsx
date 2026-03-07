import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ObjectWorkflowCard } from "../src/components/object-workflow-card"
import { getSpaceById } from "../src/lib/mock-data"

const refreshMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}))

const testSpace = getSpaceById("orchard-main-house")
const testObject = testSpace?.objects[0]

describe("ObjectWorkflowCard", () => {
  afterEach(() => {
    refreshMock.mockReset()
    vi.restoreAllMocks()
  })

  it("patches the selected object and shows workflow feedback", async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
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

    render(
      <ObjectWorkflowCard
        objectRecord={testObject!}
        objectRoute="/spaces/orchard-main-house/objects/walnut-cabinet"
        spaceId="orchard-main-house"
      />,
    )

    await user.type(
      screen.getByRole("textbox", { name: /audit-notiz/i }),
      "Familienentscheidung dokumentiert",
    )
    await user.click(screen.getByRole("button", { name: /behalten/i }))

    await waitFor(() => {
      expect(screen.getByText(/Behalten gespeichert/i)).toBeInTheDocument()
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(/spaces\/orchard-main-house\/objects\/walnut-cabinet$/)
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "PATCH" })
    expect(refreshMock).toHaveBeenCalledTimes(1)
  })
})
