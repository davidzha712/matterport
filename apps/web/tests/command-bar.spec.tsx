import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CommandBar } from "../src/components/command-bar"
import { BridgeProvider } from "../src/lib/bridge-context"
import { LocaleProvider } from "../src/lib/i18n"
import { getSpaceById } from "../src/lib/mock-data"

const testSpace = getSpaceById("orchard-main-house")

function renderCommandBar() {
  return render(
    <LocaleProvider>
      <BridgeProvider>
        <CommandBar room={testSpace?.rooms[0]} space={testSpace!} />
      </BridgeProvider>
    </LocaleProvider>
  )
}

function createSseResponse(payload: unknown) {
  const encoder = new TextEncoder()

  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
        controller.close()
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
      },
      status: 200,
    }
  )
}

describe("CommandBar", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("submits an AI task and renders the routed provider result", async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      createSseResponse({
        progress: 100,
        result: {
          output: {
            structuredData: {
              attachmentCount: 1,
            },
            summary: "MiniMax lieferte eine review-first Analyse.",
            warnings: ["Human review required."],
          },
          provider: {
            configured: true,
            providerId: "minimax",
            reason: "MiniMax is configured.",
          },
          taskType: "vision-detect",
        },
        step: "done",
      })
    )

    renderCommandBar()

    await user.type(
      screen.getByRole("textbox", { name: /^url$/i }),
      "https://example.com/capture.jpg"
    )
    await user.click(screen.getByRole("button", { name: /^suchen$/i }))

    await waitFor(() => {
      expect(screen.getByText(/MiniMax lieferte eine review-first Analyse/i)).toBeInTheDocument()
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(/\/api\/ai\/vision$/)
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
    })
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      input: {
        attachments: [
          {
            kind: "image",
            label: "Externe Bild-URL",
            url: "https://example.com/capture.jpg",
          },
        ],
        context: {
          mode: "immersive-shell",
        },
        projectId: "estate-orchard",
        roomId: "living-room",
        spaceId: "orchard-main-house",
      },
      taskType: "vision-detect",
    })
  })

  it("shows a useful error state when the backend is unavailable", async () => {
    const user = userEvent.setup()
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ detail: "No configured AI provider is available." }), {
        headers: {
          "Content-Type": "application/json",
        },
        status: 503,
      })
    )

    renderCommandBar()

    await user.click(screen.getByRole("tab", { name: /raum erzählen/i }))
    await user.click(screen.getByRole("button", { name: /^suchen$/i }))

    await waitFor(() => {
      expect(screen.getByText(/no configured ai provider is available/i)).toBeInTheDocument()
    })
  })

  it("keeps vision submit disabled until an image is attached", () => {
    renderCommandBar()

    expect(screen.getByRole("button", { name: /^suchen$/i })).toBeDisabled()
    expect(
      screen.getByText(/für die visuelle analyse wird mindestens ein bild benötigt/i)
    ).toBeInTheDocument()
  })

  it("passes sdk screenshots through to the annotation batch payload", async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      createSseResponse({
        progress: 100,
        result: {
          output: {
            structuredData: {
              objects: [
                {
                  bbox: [10, 20, 30, 40],
                  description: "Detected from screenshot",
                  label: "Cabinet",
                },
              ],
            },
            summary: "Detected object.",
            warnings: [],
          },
          provider: {
            configured: true,
            providerId: "minimax",
            reason: "MiniMax is configured.",
          },
          taskType: "vision-detect",
        },
        step: "done",
      })
    )

    renderCommandBar()

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent("matterport-screenshot", {
          detail: {
            dataUrl: "data:image/png;base64,abc123",
            pose: null,
          },
        })
      )
    })

    const batchEventPromise = new Promise<CustomEvent>((resolve) => {
      window.addEventListener(
        "annotations-from-ai",
        (event) => resolve(event as CustomEvent),
        { once: true },
      )
    })

    await user.click(screen.getByRole("button", { name: /^suchen$/i }))

    const batchEvent = await batchEventPromise

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(batchEvent.detail).toMatchObject({
      captureDataUrl: "data:image/png;base64,abc123",
      roomId: "living-room",
      roomName: "Living Room",
      spaceId: "orchard-main-house",
    })
  })
})
