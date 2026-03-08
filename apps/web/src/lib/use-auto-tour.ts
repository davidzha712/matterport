"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { MatterportBridge } from "./matterport-bridge"
import type { BridgeStatus } from "./matterport-bridge"

type AutoTourState = "idle" | "waiting" | "touring"

const IDLE_TIMEOUT_MS = 15_000 // 15s of no interaction → start auto tour

export function useAutoTour(
  bridge: MatterportBridge,
  status: BridgeStatus,
  isTourActive: boolean
) {
  const [autoTourState, setAutoTourState] = useState<AutoTourState>("idle")
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const userInteractedRef = useRef(false)

  const resetIdleTimer = useCallback(() => {
    userInteractedRef.current = true

    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }

    // If auto tour is running, stop it on user interaction
    if (autoTourState === "touring") {
      void bridge.stopTour()
      setAutoTourState("idle")
    }

    // Restart idle countdown
    setAutoTourState("waiting")
    idleTimerRef.current = setTimeout(() => {
      if (status === "sdk-connected" && !isTourActive) {
        void bridge.startTour().then((started) => {
          if (started) {
            setAutoTourState("touring")
          }
        })
      }
    }, IDLE_TIMEOUT_MS)
  }, [autoTourState, bridge, isTourActive, status])

  // Start initial idle countdown when SDK connects
  useEffect(() => {
    if (status !== "sdk-connected") return

    // Don't auto-start if user has already interacted
    if (userInteractedRef.current) return

    idleTimerRef.current = setTimeout(() => {
      if (!isTourActive) {
        void bridge.startTour().then((started) => {
          if (started) {
            setAutoTourState("touring")
          }
        })
      }
    }, IDLE_TIMEOUT_MS)

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
    }
  }, [bridge, isTourActive, status])

  // Listen for user interaction events to reset idle timer
  useEffect(() => {
    const events = ["keydown", "mousedown", "touchstart", "wheel"] as const

    function onInteraction() {
      resetIdleTimer()
    }

    for (const evt of events) {
      window.addEventListener(evt, onInteraction, { passive: true })
    }

    return () => {
      for (const evt of events) {
        window.removeEventListener(evt, onInteraction)
      }
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
    }
  }, [resetIdleTimer])

  // Sync tour state from bridge
  useEffect(() => {
    if (!isTourActive && autoTourState === "touring") {
      // Tour ended naturally (finished all steps)
      setAutoTourState("idle")
      // Restart idle timer to loop
      idleTimerRef.current = setTimeout(() => {
        if (status === "sdk-connected") {
          void bridge.startTour().then((started) => {
            if (started) {
              setAutoTourState("touring")
            }
          })
        }
      }, IDLE_TIMEOUT_MS)
    }
  }, [autoTourState, bridge, isTourActive, status])

  const startAutoTour = useCallback(() => {
    if (status === "sdk-connected") {
      void bridge.startTour().then((started) => {
        if (started) {
          setAutoTourState("touring")
        }
      })
    }
  }, [bridge, status])

  const stopAutoTour = useCallback(() => {
    void bridge.stopTour()
    setAutoTourState("idle")
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
  }, [bridge])

  return {
    autoTourState,
    startAutoTour,
    stopAutoTour,
  }
}
