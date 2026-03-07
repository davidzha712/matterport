import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CommandBar } from "../src/components/command-bar"
import { getSpaceById } from "../src/lib/mock-data"

const testSpace = getSpaceById("orchard-main-house")

describe("CommandBar", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("submits an AI task and renders the routed provider result", async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          output: {
            structuredData: {
              attachmentCount: 1
            },
            summary: "MiniMax lieferte eine review-first Analyse.",
            warnings: ["Human review required."]
          },
          provider: {
            configured: true,
            providerId: "minimax",
            reason: "MiniMax is configured."
          },
          taskType: "vision-detect"
        }),
        {
          headers: {
            "Content-Type": "application/json"
          },
          status: 200
        }
      )
    )

    render(<CommandBar room={testSpace?.rooms[0]} space={testSpace!} />)

    await user.type(
      screen.getByLabelText(/bild-url/i),
      "https://example.com/capture.jpg"
    )
    await user.click(screen.getByRole("button", { name: /analyse starten/i }))

    await waitFor(() => {
      expect(screen.getByText(/MiniMax lieferte eine review-first Analyse/i)).toBeInTheDocument()
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(/\/ai\/tasks$/)
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST"
    })
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      input: {
        attachments: [
          {
            kind: "image",
            url: "https://example.com/capture.jpg"
          }
        ],
        projectId: "estate-orchard",
        roomId: "living-room",
        spaceId: "orchard-main-house"
      },
      taskType: "vision-detect"
    })
  })

  it("shows a useful error state when the backend is unavailable", async () => {
    const user = userEvent.setup()
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ detail: "No configured AI provider is available." }), {
        headers: {
          "Content-Type": "application/json"
        },
        status: 503
      })
    )

    render(<CommandBar room={testSpace?.rooms[0]} space={testSpace!} />)

    await user.click(screen.getByRole("tab", { name: /raum erzaehlen/i }))
    await user.click(screen.getByRole("button", { name: /analyse starten/i }))

    await waitFor(() => {
      expect(screen.getByText(/no configured ai provider is available/i)).toBeInTheDocument()
    })
  })

  it("keeps vision submit disabled until an image is attached", () => {
    render(<CommandBar room={testSpace?.rooms[0]} space={testSpace!} />)

    expect(screen.getByRole("button", { name: /analyse starten/i })).toBeDisabled()
    expect(
      screen.getByText(/fuer die visuelle analyse wird mindestens ein bild benoetigt/i)
    ).toBeInTheDocument()
  })
})
