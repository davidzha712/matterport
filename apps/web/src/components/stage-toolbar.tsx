"use client"

import { useCallback, useEffect, useState } from "react"
import type { MatterportBridge, ViewMode } from "@/lib/matterport-bridge"
import { useT } from "@/lib/i18n"

type StageToolbarProps = {
  bridge: MatterportBridge
}

type TourState = "idle" | "playing" | "paused"

export function StageToolbar({ bridge }: StageToolbarProps) {
  const t = useT()
  const [currentMode, setCurrentMode] = useState<ViewMode>("inside")
  const [tourState, setTourState] = useState<TourState>("idle")
  const [sdkReady, setSdkReady] = useState(bridge.status === "sdk-connected")

  const viewModeLabels: Record<ViewMode, string> = {
    inside: t.viewModes.inside,
    dollhouse: t.viewModes.dollhouse,
    floorplan: t.viewModes.floorplan,
  }

  useEffect(() => {
    const unsubMode = bridge.onModeChange((mode) => {
      setCurrentMode(mode)
    })

    const unsubTour = bridge.onTourStateChange((active) => {
      setTourState(active ? "playing" : "idle")
    })

    const checkReady = setInterval(() => {
      if (bridge.status === "sdk-connected") {
        setSdkReady(true)
        clearInterval(checkReady)
      }
    }, 500)

    return () => {
      unsubMode()
      unsubTour()
      clearInterval(checkReady)
    }
  }, [bridge])

  const handleModeSwitch = useCallback(
    (mode: ViewMode) => {
      void bridge.setViewMode(mode)
    },
    [bridge]
  )

  const handleTourToggle = useCallback(() => {
    if (tourState === "playing") {
      void bridge.stopTour()
      setTourState("idle")
    } else {
      void bridge.startTour()
      setTourState("playing")
    }
  }, [bridge, tourState])

  const handleTourNext = useCallback(() => {
    void bridge.nextTourStep()
  }, [bridge])

  const handleTourPrev = useCallback(() => {
    void bridge.prevTourStep()
  }, [bridge])

  const handleScreenshot = useCallback(async () => {
    const dataUrl = await bridge.captureScreenshot()
    if (dataUrl) {
      window.dispatchEvent(
        new CustomEvent("matterport-screenshot", { detail: { dataUrl } })
      )
    }
  }, [bridge])

  if (!sdkReady) {
    return null
  }

  return (
    <div className="stage-toolbar">
      <div className="stage-toolbar__group" role="group" aria-label={t.stage.mode}>
        {(Object.keys(viewModeLabels) as ViewMode[]).map((mode) => (
          <button
            key={mode}
            className={`stage-toolbar__btn${currentMode === mode ? " stage-toolbar__btn--active" : ""}`}
            onClick={() => handleModeSwitch(mode)}
            type="button"
          >
            {viewModeLabels[mode]}
          </button>
        ))}
      </div>

      <div className="stage-toolbar__divider" aria-hidden="true" />

      <div className="stage-toolbar__group" role="group" aria-label={t.tour.autoTour}>
        {tourState === "playing" ? (
          <>
            <button
              className="stage-toolbar__btn"
              onClick={handleTourPrev}
              title={t.tour.prevStop}
              type="button"
            >
              ‹
            </button>
            <button
              className="stage-toolbar__btn stage-toolbar__btn--active"
              onClick={handleTourToggle}
              type="button"
            >
              {t.tour.stopTour}
            </button>
            <button
              className="stage-toolbar__btn"
              onClick={handleTourNext}
              title={t.tour.nextStop}
              type="button"
            >
              ›
            </button>
          </>
        ) : (
          <button
            className="stage-toolbar__btn"
            onClick={handleTourToggle}
            type="button"
          >
            {t.tour.autoTour}
          </button>
        )}
      </div>

      <div className="stage-toolbar__divider" aria-hidden="true" />

      <button
        className="stage-toolbar__btn"
        onClick={() => void handleScreenshot()}
        title={t.stage.captureView}
        type="button"
      >
        {t.stage.captureView}
      </button>
    </div>
  )
}
