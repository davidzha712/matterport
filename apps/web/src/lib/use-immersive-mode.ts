"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { MatterportBridge } from "./matterport-bridge"

export type UserRole = "admin" | "visitor"

export function useImmersiveMode(bridge: MatterportBridge) {
  const [isImmersive, setIsImmersive] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [role, setRole] = useState<UserRole>("visitor")
  const throttleRef = useRef(false)

  const enterImmersive = useCallback(() => {
    setIsImmersive(true)
    setShowDialog(false)
  }, [])

  const exitImmersive = useCallback(() => {
    setIsImmersive(false)
    setShowDialog(false)
  }, [])

  const toggleDialog = useCallback(() => {
    setShowDialog((prev) => !prev)
  }, [])

  useEffect(() => {
    if (!isImmersive) return

    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return

      switch (e.key) {
        case "Escape":
          setIsImmersive(false)
          setShowDialog(false)
          break

        case "w":
        case "W":
        case "ArrowUp":
          e.preventDefault()
          if (!throttleRef.current) {
            throttleRef.current = true
            void bridge.navigateInDirection("forward").finally(() => {
              setTimeout(() => {
                throttleRef.current = false
              }, 400)
            })
          }
          break

        case "s":
        case "S":
        case "ArrowDown":
          e.preventDefault()
          if (!throttleRef.current) {
            throttleRef.current = true
            void bridge.navigateInDirection("backward").finally(() => {
              setTimeout(() => {
                throttleRef.current = false
              }, 400)
            })
          }
          break

        case "a":
        case "A":
        case "ArrowLeft":
          e.preventDefault()
          void bridge.rotateCamera(-30, 0)
          break

        case "d":
        case "D":
        case "ArrowRight":
          e.preventDefault()
          void bridge.rotateCamera(30, 0)
          break

        case " ":
          e.preventDefault()
          setShowDialog((prev) => !prev)
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [bridge, isImmersive])

  return {
    isImmersive,
    showDialog,
    role,
    enterImmersive,
    exitImmersive,
    toggleDialog,
    setRole,
    setShowDialog,
  }
}
