"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useBridge } from "@/lib/bridge-context"
import { useT } from "@/lib/i18n"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type MeasurePoint = {
  world: { x: number; y: number; z: number }
  screenX: number
  screenY: number
}

type Measurement = {
  a: MeasurePoint
  b: MeasurePoint
  distance: number
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
  const t = useT()
  const [pointA, setPointA] = useState<MeasurePoint | null>(null)
  const [cursorScreen, setCursorScreen] = useState<{ x: number; y: number } | null>(null)
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const iframeRectRef = useRef<DOMRect | null>(null)

  // Update iframe rect on resize
  useEffect(() => {
    if (!active) return
    function updateRect() {
      const iframe = document.querySelector("iframe")
      if (iframe) iframeRectRef.current = iframe.getBoundingClientRect()
    }
    updateRect()
    window.addEventListener("resize", updateRect)
    return () => window.removeEventListener("resize", updateRect)
  }, [active])

  // Track mouse position for live line
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setCursorScreen({ x: e.clientX, y: e.clientY })
  }, [])

  // Place measurement point
  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      if (!active || status !== "sdk-connected") return
      const rect = iframeRectRef.current
      if (!rect) return

      const screenX = e.clientX - rect.left
      const screenY = e.clientY - rect.top

      const result = await bridge.getWorldPosition(screenX, screenY)
      if (!result?.position) return

      const point: MeasurePoint = {
        world: result.position,
        screenX: e.clientX,
        screenY: e.clientY,
      }

      if (!pointA) {
        setPointA(point)
      } else {
        const dist = distance3d(pointA.world, point.world)
        setMeasurements((prev) => [...prev, { a: pointA, b: point, distance: dist }])
        setPointA(null)
      }
    },
    [active, bridge, pointA, status]
  )

  const clearAll = useCallback(() => {
    setPointA(null)
    setMeasurements([])
  }, [])

  const removeLast = useCallback(() => {
    setMeasurements((prev) => prev.slice(0, -1))
  }, [])

  const handleClose = useCallback(() => {
    setPointA(null)
    setMeasurements([])
    onClose()
  }, [onClose])

  if (!active) return null

  const liveDistance =
    pointA && cursorScreen
      ? null // We can't compute live distance without a world position for cursor
      : null

  return (
    <>
      {/* Click + mouse capture overlay */}
      <div
        className="measure-tool__capture"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
      />

      {/* SVG overlay for lines and markers */}
      <svg className="measure-tool__svg" aria-hidden="true">
        {/* Completed measurement lines */}
        {measurements.map((m, i) => {
          const midX = (m.a.screenX + m.b.screenX) / 2
          const midY = (m.a.screenY + m.b.screenY) / 2
          return (
            <g key={i}>
              <line
                x1={m.a.screenX} y1={m.a.screenY}
                x2={m.b.screenX} y2={m.b.screenY}
                className="measure-tool__line"
              />
              <circle cx={m.a.screenX} cy={m.a.screenY} r="5" className="measure-tool__dot" />
              <circle cx={m.b.screenX} cy={m.b.screenY} r="5" className="measure-tool__dot" />
              <rect
                x={midX - 36} y={midY - 12}
                width="72" height="24"
                rx="6"
                className="measure-tool__label-bg"
              />
              <text
                x={midX} y={midY + 4}
                className="measure-tool__label-text"
                textAnchor="middle"
              >
                {formatDistance(m.distance)}
              </text>
            </g>
          )
        })}

        {/* Active point A + live line to cursor */}
        {pointA ? (
          <g>
            <circle cx={pointA.screenX} cy={pointA.screenY} r="7" className="measure-tool__dot measure-tool__dot--active" />
            <text
              x={pointA.screenX + 12} y={pointA.screenY + 4}
              className="measure-tool__point-label"
            >
              A
            </text>
            {cursorScreen ? (
              <line
                x1={pointA.screenX} y1={pointA.screenY}
                x2={cursorScreen.x} y2={cursorScreen.y}
                className="measure-tool__line measure-tool__line--live"
              />
            ) : null}
          </g>
        ) : null}
      </svg>

      {/* HUD panel */}
      <div className="measure-tool">
        <div className="measure-tool__header">
          <span className="measure-tool__title">{t.measure.title}</span>
          <Button onClick={handleClose} size="sm" variant="ghost" className="h-6 px-2 text-xs">
            {t.common.close}
          </Button>
        </div>

        <div className="measure-tool__instructions">
          {!pointA ? (
            <p>{t.measure.setPointA}</p>
          ) : (
            <p>{t.measure.setPointB}</p>
          )}
        </div>

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
                {t.measure.undo}
              </Button>
              <Button onClick={clearAll} size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive">
                {t.measure.clear}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
