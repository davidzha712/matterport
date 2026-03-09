"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useBridge } from "@/lib/bridge-context"
import type { PointerIntersection } from "@/lib/matterport-bridge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type MeasurePoint = {
  position: { x: number; y: number; z: number }
  screenX: number
  screenY: number
}

function distance3d(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function formatDistance(meters: number): string {
  if (meters < 0.01) return "< 1 cm"
  if (meters < 1) return `${(meters * 100).toFixed(1)} cm`
  return `${meters.toFixed(2)} m`
}

type MeasureToolProps = {
  active: boolean
  onClose: () => void
}

export function MeasureTool({ active, onClose }: MeasureToolProps) {
  const { bridge, status } = useBridge()
  const [pointA, setPointA] = useState<MeasurePoint | null>(null)
  const [pointB, setPointB] = useState<MeasurePoint | null>(null)
  const [cursorPos, setCursorPos] = useState<PointerIntersection | null>(null)
  const [measurements, setMeasurements] = useState<
    Array<{ a: MeasurePoint; b: MeasurePoint; distance: number }>
  >([])
  const overlayRef = useRef<HTMLDivElement>(null)

  // Subscribe to pointer intersection for real-time cursor feedback
  useEffect(() => {
    if (!active || status !== "sdk-connected") return
    const unsub = bridge.onPointerMove((intersection) => {
      if (intersection.position) {
        setCursorPos(intersection)
      }
    })
    return unsub
  }, [active, bridge, status])

  // Handle click on the overlay to place measurement points
  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      if (!active || status !== "sdk-connected") return

      const iframe = document.querySelector("iframe")
      if (!iframe) return

      const rect = iframe.getBoundingClientRect()
      const screenX = e.clientX - rect.left
      const screenY = e.clientY - rect.top

      const result = await bridge.getWorldPosition(screenX, screenY)
      if (!result?.position) return

      const point: MeasurePoint = {
        position: result.position,
        screenX: e.clientX,
        screenY: e.clientY,
      }

      if (!pointA) {
        setPointA(point)
        setPointB(null)
      } else if (!pointB) {
        setPointB(point)
        const dist = distance3d(pointA.position, point.position)
        setMeasurements((prev) => [...prev, { a: pointA, b: point, distance: dist }])
        // Reset for next measurement
        setPointA(null)
        setPointB(null)
      }
    },
    [active, bridge, pointA, pointB, status]
  )

  const clearAll = useCallback(() => {
    setPointA(null)
    setPointB(null)
    setMeasurements([])
  }, [])

  const removeLast = useCallback(() => {
    setMeasurements((prev) => prev.slice(0, -1))
  }, [])

  if (!active) return null

  const liveDistance =
    pointA && cursorPos?.position
      ? distance3d(pointA.position, cursorPos.position)
      : null

  return (
    <>
      {/* Click capture overlay — transparent, above iframe but below our UI */}
      <div
        ref={overlayRef}
        className="measure-tool__capture"
        onClick={handleClick}
      />

      {/* Measurement HUD */}
      <div className="measure-tool">
        <div className="measure-tool__header">
          <span className="measure-tool__title">Measurement</span>
          <Button onClick={onClose} size="sm" variant="ghost" className="h-6 px-2 text-xs">
            Close
          </Button>
        </div>

        <div className="measure-tool__instructions">
          {!pointA ? (
            <p>Click a point to start measuring</p>
          ) : (
            <p>Click another point to complete</p>
          )}
        </div>

        {/* Live distance while measuring */}
        {liveDistance !== null ? (
          <div className="measure-tool__live">
            <Badge variant="secondary" className="text-base font-mono tabular-nums">
              {formatDistance(liveDistance)}
            </Badge>
          </div>
        ) : null}

        {/* Saved measurements */}
        {measurements.length > 0 ? (
          <div className="measure-tool__results">
            <ul className="measure-tool__list">
              {measurements.map((m, i) => (
                <li key={i} className="measure-tool__item">
                  <span className="measure-tool__item-label">#{i + 1}</span>
                  <span className="measure-tool__item-value">{formatDistance(m.distance)}</span>
                </li>
              ))}
            </ul>
            <div className="measure-tool__actions">
              <Button onClick={removeLast} size="sm" variant="ghost" className="h-6 px-2 text-xs">
                Undo Last
              </Button>
              <Button onClick={clearAll} size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive">
                Clear All
              </Button>
            </div>
          </div>
        ) : null}

        {/* Point A indicator */}
        {pointA ? (
          <div className="measure-tool__point-info">
            <span className="text-xs text-muted-foreground">
              A: ({pointA.position.x.toFixed(2)}, {pointA.position.y.toFixed(2)}, {pointA.position.z.toFixed(2)})
            </span>
          </div>
        ) : null}
      </div>

      {/* Point A marker on screen */}
      {pointA ? (
        <div
          className="measure-tool__marker"
          style={{ left: pointA.screenX, top: pointA.screenY }}
        >
          A
        </div>
      ) : null}
    </>
  )
}
