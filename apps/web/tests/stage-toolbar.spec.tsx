import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { StageToolbar } from "../src/components/stage-toolbar"
import { LocaleProvider } from "../src/lib/i18n"
import type { MatterportBridge } from "../src/lib/matterport-bridge"

function createBridgeMock(): MatterportBridge {
  return {
    captureScreenshot: vi.fn(),
    nextTourStep: vi.fn(),
    onModeChange: vi.fn((cb: (mode: "inside" | "dollhouse" | "floorplan") => void) => {
      cb("dollhouse")
      return () => {}
    }),
    onTourStateChange: vi.fn(() => () => {}),
    prevTourStep: vi.fn(),
    setViewMode: vi.fn(),
    startTour: vi.fn(),
    status: "sdk-connected",
    stopTour: vi.fn(),
  } as unknown as MatterportBridge
}

describe("StageToolbar", () => {
  it("shows the live inside state even when the last sdk mode callback is stale", () => {
    render(
      <LocaleProvider>
        <StageToolbar
          bridge={createBridgeMock()}
          currentViewMode="inside"
          toolbarConfig={{
            aiDetect: false,
            measure: false,
            screenshot: false,
            tour: false,
            viewModes: true,
          }}
        />
      </LocaleProvider>,
    )

    expect(screen.getByRole("button", { name: /innenansicht/i })).toHaveClass("stage-toolbar__btn--active")
    expect(screen.getByRole("button", { name: /puppenhaus/i })).not.toHaveClass("stage-toolbar__btn--active")
  })
})
