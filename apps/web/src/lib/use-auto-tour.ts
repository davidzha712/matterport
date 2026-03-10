"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { MatterportBridge } from "./matterport-bridge"
import type { BridgeStatus } from "./matterport-bridge"

type AutoTourState = "idle" | "waiting" | "touring"

export type TourSpeed = "slow" | "normal" | "fast"

const SPEED_PAUSE_MS: Record<TourSpeed, number> = {
  slow: 8000,
  normal: 4000,
  fast: 2000,
}

const IDLE_TIMEOUT_MS = 45_000 // 45s of no interaction → start auto tour

export function useAutoTour(
  bridge: MatterportBridge,
  status: BridgeStatus,
  isTourActive: boolean
) {
  const [autoTourState, setAutoTourState] = useState<AutoTourState>("idle")
  const [tourSpeed, setTourSpeed] = useState<TourSpeed>("normal")
  const tourSpeedRef = useRef<TourSpeed>(tourSpeed)
  tourSpeedRef.current = tourSpeed
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const userInteractedRef = useRef(false)
  const userStoppedTourRef = useRef(false)
  const aiAnalyzingRef = useRef(false)
  const customTourIndexRef = useRef(-1)
  const customTourActiveRef = useRef(false)
  const snapshotCountRef = useRef(0)

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
    if (stepTimerRef.current) {
      clearTimeout(stepTimerRef.current)
      stepTimerRef.current = null
    }
  }, [])

  // Pause auto-tour idle timer while AI analysis is running
  useEffect(() => {
    function onAIProgress(event: Event) {
      const detail = (event as CustomEvent<{ step: string; progress: number } | null>).detail
      if (!detail) {
        aiAnalyzingRef.current = false
        return
      }
      if (!aiAnalyzingRef.current) {
        aiAnalyzingRef.current = true
        clearTimers()
      }
    }
    window.addEventListener("ai-analysis-progress", onAIProgress)
    return () => window.removeEventListener("ai-analysis-progress", onAIProgress)
  }, [clearTimers])

  // Custom stepped tour: advance to next snapshot with speed-controlled pause
  // Uses tourSpeedRef instead of tourSpeed closure to avoid stale-closure bug
  // in recursive setTimeout chains.
  const advanceCustomTour = useCallback(async () => {
    if (!customTourActiveRef.current) return

    const nextIndex = customTourIndexRef.current + 1
    if (nextIndex >= snapshotCountRef.current) {
      // Tour finished all stops — stop cleanly, do NOT loop
      customTourActiveRef.current = false
      customTourIndexRef.current = -1
      setAutoTourState("idle")
      void bridge.stopTour()
      return
    }

    customTourIndexRef.current = nextIndex
    const stepped = await bridge.stepTour(nextIndex)
    if (!stepped || !customTourActiveRef.current) return

    // Schedule next step after speed-controlled pause (read current speed from ref)
    stepTimerRef.current = setTimeout(() => {
      void advanceCustomTour()
    }, SPEED_PAUSE_MS[tourSpeedRef.current])
  }, [bridge])

  // Start a custom stepped tour (speed-controllable)
  const startCustomTour = useCallback(async () => {
    const snapshots = await bridge.getTourSnapshots()
    if (snapshots.length === 0) return

    snapshotCountRef.current = snapshots.length
    customTourIndexRef.current = -1
    customTourActiveRef.current = true
    setAutoTourState("touring")

    void advanceCustomTour()
  }, [bridge, advanceCustomTour])

  // Stop custom tour
  const stopCustomTour = useCallback(() => {
    customTourActiveRef.current = false
    customTourIndexRef.current = -1
    clearTimers()
    void bridge.stopTour()
    setAutoTourState("idle")
  }, [bridge, clearTimers])

  // When speed changes mid-tour, restart the current step timer immediately
  // so the new pause duration takes effect without waiting for the old timer
  useEffect(() => {
    if (!customTourActiveRef.current) return
    if (stepTimerRef.current) {
      clearTimeout(stepTimerRef.current)
      stepTimerRef.current = setTimeout(() => {
        void advanceCustomTour()
      }, SPEED_PAUSE_MS[tourSpeed])
    }
  }, [tourSpeed, advanceCustomTour])

  const resetIdleTimer = useCallback(() => {
    userInteractedRef.current = true

    clearTimers()

    // If custom tour is running, stop it on user interaction
    if (customTourActiveRef.current) {
      stopCustomTour()
      userStoppedTourRef.current = true
      return
    }

    // If SDK tour is running (started from toolbar), stop it
    if (autoTourState === "touring") {
      stopCustomTour()
      userStoppedTourRef.current = true
      return
    }

    // Don't restart idle countdown if user previously stopped a tour,
    // or if AI is analyzing
    if (userStoppedTourRef.current || aiAnalyzingRef.current) return

    // Restart idle countdown
    setAutoTourState("waiting")
    idleTimerRef.current = setTimeout(() => {
      if (status === "sdk-connected" && !isTourActive && !aiAnalyzingRef.current) {
        void startCustomTour()
      }
    }, IDLE_TIMEOUT_MS)
  }, [autoTourState, clearTimers, isTourActive, startCustomTour, status, stopCustomTour])

  // Start initial idle countdown when SDK connects
  useEffect(() => {
    if (status !== "sdk-connected") return
    if (userInteractedRef.current || aiAnalyzingRef.current || userStoppedTourRef.current) return

    idleTimerRef.current = setTimeout(() => {
      if (!isTourActive && !aiAnalyzingRef.current) {
        void startCustomTour()
      }
    }, IDLE_TIMEOUT_MS)

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
    }
  }, [isTourActive, startCustomTour, status])

  // Listen for user interaction events to reset idle timer
  useEffect(() => {
    const events = ["keydown", "mousedown", "mousemove", "touchstart", "wheel"] as const

    let lastMove = 0
    function onInteraction(e: Event) {
      // Throttle mousemove to avoid excessive timer resets
      if (e.type === "mousemove") {
        const now = Date.now()
        if (now - lastMove < 2000) return
        lastMove = now
      }
      resetIdleTimer()
    }

    for (const evt of events) {
      window.addEventListener(evt, onInteraction, { passive: true })
    }

    return () => {
      for (const evt of events) {
        window.removeEventListener(evt, onInteraction)
      }
      clearTimers()
    }
  }, [resetIdleTimer, clearTimers])

  // Sync: if SDK tour stops externally (e.g. user clicked in 3D), update state
  useEffect(() => {
    if (!isTourActive && autoTourState === "touring" && !customTourActiveRef.current) {
      setAutoTourState("idle")
      clearTimers()
    }
  }, [autoTourState, clearTimers, isTourActive])

  const startAutoTour = useCallback(() => {
    userStoppedTourRef.current = false
    if (status === "sdk-connected") {
      void startCustomTour()
    }
  }, [startCustomTour, status])

  const stopAutoTour = useCallback(() => {
    userStoppedTourRef.current = true
    stopCustomTour()
  }, [stopCustomTour])

  return {
    autoTourState,
    tourSpeed,
    setTourSpeed,
    startAutoTour,
    stopAutoTour,
  }
}
