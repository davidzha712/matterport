"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { MatterportBridge, type BridgeStatus } from "./matterport-bridge"

type BridgeContextValue = {
  bridge: MatterportBridge
  status: BridgeStatus
}

const BridgeContext = createContext<BridgeContextValue | null>(null)

export function BridgeProvider({ children }: { children: ReactNode }) {
  const [bridge] = useState(() => new MatterportBridge())
  const [status, setStatus] = useState<BridgeStatus>(bridge.status)

  useEffect(() => {
    const interval = setInterval(() => {
      if (bridge.status !== status) {
        setStatus(bridge.status)
      }
    }, 300)
    return () => clearInterval(interval)
  }, [bridge, status])

  const value = useMemo(() => ({ bridge, status }), [bridge, status])

  return <BridgeContext value={value}>{children}</BridgeContext>
}

export function useBridge(): BridgeContextValue {
  const ctx = useContext(BridgeContext)
  if (!ctx) throw new Error("useBridge must be used within BridgeProvider")
  return ctx
}
