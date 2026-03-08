"use client"

import { useCallback, useEffect, useState } from "react"
import type { MatterportBridge, ViewMode, RoomData } from "@/lib/matterport-bridge"
import { useT } from "@/lib/i18n"

type StageToolbarProps = {
  bridge: MatterportBridge
  currentRoom?: RoomData
}

type TourState = "idle" | "playing" | "paused"

export function StageToolbar({ bridge, currentRoom }: StageToolbarProps) {
  const t = useT()
  const [currentMode, setCurrentMode] = useState<ViewMode>("inside")
  const [tourState, setTourState] = useState<TourState>("idle")
  const [sdkReady, setSdkReady] = useState(bridge.status === "sdk-connected")
  const [showDimensions, setShowDimensions] = useState(false)
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null)

  const viewModeLabels: Record<ViewMode, string> = {
    inside: t.viewModes.inside,
    dollhouse: t.viewModes.dollhouse,
    floorplan: t.viewModes.floorplan,
  }

  // Room dimensions from SDK bounds
  const roomDimensions = currentRoom?.bounds
    ? {
        width: Math.abs(currentRoom.bounds.max.x - currentRoom.bounds.min.x).toFixed(1),
        depth: Math.abs(currentRoom.bounds.max.z - currentRoom.bounds.min.z).toFixed(1),
        height: Math.abs(currentRoom.bounds.max.y - currentRoom.bounds.min.y).toFixed(1),
      }
    : null

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

  const handleVisionAnalysis = useCallback(async () => {
    setAnalysisStatus(t.ai.analyzing)
    const dataUrl = await bridge.captureScreenshot()
    if (dataUrl) {
      window.dispatchEvent(
        new CustomEvent("matterport-screenshot", { detail: { dataUrl } })
      )
      // Auto-submit after command-bar picks up the screenshot
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("auto-vision-analyze"))
        setAnalysisStatus(null)
      }, 400)
    } else {
      setAnalysisStatus(null)
    }
  }, [bridge, t])

  return (
    <div className="stage-toolbar">
      <div className="stage-toolbar__group" role="group" aria-label={t.stage.mode}>
        {(Object.keys(viewModeLabels) as ViewMode[]).map((mode) => (
          <button
            key={mode}
            className={`stage-toolbar__btn${currentMode === mode ? " stage-toolbar__btn--active" : ""}`}
            disabled={!sdkReady}
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
              disabled={!sdkReady}
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
              disabled={!sdkReady}
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
            disabled={!sdkReady}
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
        disabled={!sdkReady}
        onClick={() => void handleScreenshot()}
        title={t.stage.captureView}
        type="button"
      >
        {t.stage.captureView}
      </button>

      <button
        className="stage-toolbar__btn stage-toolbar__btn--accent"
        disabled={!sdkReady || analysisStatus !== null}
        onClick={() => void handleVisionAnalysis()}
        title={t.ai.detectObjects}
        type="button"
      >
        {analysisStatus ?? t.ai.detectObjects}
      </button>

      {!sdkReady ? (
        <>
          <div className="stage-toolbar__divider" aria-hidden="true" />
          <span className="stage-toolbar__status">SDK: {t.common.loading}</span>
        </>
      ) : null}

      {roomDimensions ? (
        <>
          <div className="stage-toolbar__divider" aria-hidden="true" />
          <button
            className={`stage-toolbar__btn${showDimensions ? " stage-toolbar__btn--active" : ""}`}
            onClick={() => setShowDimensions((v) => !v)}
            type="button"
          >
            {showDimensions
              ? `${roomDimensions.width}m × ${roomDimensions.depth}m × ${roomDimensions.height}m`
              : `${currentRoom?.name ?? ""} ${t.stage.roomContext}`}
          </button>
        </>
      ) : null}
    </div>
  )
}
