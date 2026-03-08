"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  MatterportBridge,
  type BridgeStatus,
  type RoomData,
  type SweepData,
  type ViewMode,
} from "./matterport-bridge"

type BridgeContextValue = {
  bridge: MatterportBridge
  currentFloor: { id: string; sequence: number } | undefined
  currentMode: ViewMode
  currentRoom: RoomData | undefined
  currentSweep: SweepData | null
  isTourActive: boolean
  status: BridgeStatus
}

const BridgeContext = createContext<BridgeContextValue | null>(null)

export function BridgeProvider({ children }: { children: ReactNode }) {
  const [bridge] = useState(() => new MatterportBridge())
  const [status, setStatus] = useState<BridgeStatus>(bridge.status)
  const [currentRoom, setCurrentRoom] = useState<RoomData | undefined>(bridge.currentRoom)
  const [currentSweep, setCurrentSweep] = useState<SweepData | null>(bridge.currentSweep)
  const [currentMode, setCurrentMode] = useState<ViewMode>("inside")
  const [currentFloor, setCurrentFloor] = useState(bridge.currentFloor)
  const [isTourActive, setIsTourActive] = useState(bridge.isTourActive)

  useEffect(() => {
    const unsubRoom = bridge.onRoomChange((room) => {
      setCurrentRoom(room ? { ...room } : undefined)
    })
    const unsubSweep = bridge.onSweepChange((sweep) => {
      setCurrentSweep({ ...sweep })
    })
    const unsubMode = bridge.onModeChange((mode) => {
      setCurrentMode(mode)
    })
    const unsubFloor = bridge.onFloorChange((floor) => {
      setCurrentFloor(floor ? { ...floor } : undefined)
    })
    const unsubTour = bridge.onTourStateChange((active) => {
      setIsTourActive(active)
    })

    const interval = setInterval(() => {
      if (bridge.status !== status) {
        setStatus(bridge.status)
      }
    }, 300)

    return () => {
      unsubRoom()
      unsubSweep()
      unsubMode()
      unsubFloor()
      unsubTour()
      clearInterval(interval)
    }
  }, [bridge, status])

  const value = useMemo(
    () => ({
      bridge,
      currentFloor,
      currentMode,
      currentRoom,
      currentSweep,
      isTourActive,
      status,
    }),
    [bridge, currentFloor, currentMode, currentRoom, currentSweep, isTourActive, status]
  )

  return <BridgeContext value={value}>{children}</BridgeContext>
}

export function useBridge() {
  const ctx = useContext(BridgeContext)
  if (!ctx) throw new Error("useBridge must be used within BridgeProvider")
  return ctx
}
