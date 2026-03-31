"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useBridge } from "@/lib/bridge-context"
import { useT } from "@/lib/i18n"
import type { PointerIntersection } from "@/lib/matterport-bridge"

type MenuPosition = { x: number; y: number }

type MenuView = "actions" | "add-marker"

type StageContextMenuProps = {
  allowMarkerCreation?: boolean
  allowObjectDetection?: boolean
  spaceId: string
  roomName?: string
  annotationMode: boolean
  onExitAnnotationMode: () => void
}

function distanceSq(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return dx * dx + dy * dy + dz * dz
}

export function StageContextMenu({
  allowMarkerCreation = true,
  allowObjectDetection = true,
  spaceId,
  roomName,
  annotationMode,
  onExitAnnotationMode,
}: StageContextMenuProps) {
  const { bridge, status, currentRoom } = useBridge()
  const t = useT()

  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null)
  const [view, setView] = useState<MenuView>("actions")
  const [label, setLabel] = useState("")
  const [description, setDescription] = useState("")
  const [feedback, setFeedback] = useState<string | null>(null)
  const [menuIntersection, setMenuIntersection] = useState<PointerIntersection | null>(null)

  const lastIntersectionRef = useRef<PointerIntersection | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const labelInputRef = useRef<HTMLInputElement | null>(null)
  const lastCursorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Track pointer intersection from bridge (3D position under cursor)
  useEffect(() => {
    if (status !== "sdk-connected") return

    const unsub = bridge.onPointerMove((intersection) => {
      lastIntersectionRef.current = intersection
    })

    return unsub
  }, [bridge, status])

  // Track cursor screen position globally
  useEffect(() => {
    function onMove(e: MouseEvent) {
      lastCursorRef.current = { x: e.clientX, y: e.clientY }
    }
    document.addEventListener("mousemove", onMove, { passive: true })
    return () => document.removeEventListener("mousemove", onMove)
  }, [])

  // Open menu at a given screen position
  const openMenuAt = useCallback((clientX: number, clientY: number) => {
    const margin = 8
    const menuWidth = 260
    const menuHeight = 200

    const x =
      clientX + menuWidth + margin > window.innerWidth
        ? clientX - menuWidth
        : clientX
    const y =
      clientY + menuHeight + margin > window.innerHeight
        ? clientY - menuHeight
        : clientY

    setMenuPos({ x: Math.max(margin, x), y: Math.max(margin, y) })
    setMenuIntersection(
      lastIntersectionRef.current
        ? {
            ...lastIntersectionRef.current,
            normal: { ...lastIntersectionRef.current.normal },
            position: { ...lastIntersectionRef.current.position },
          }
        : null
    )
    setView("actions")
    setLabel("")
    setDescription("")
    setFeedback(null)
  }, [])

  // Right-click on document (works even over cross-origin iframe in some cases)
  useEffect(() => {
    function handleContextMenu(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest(".stage-shell")) return
      if (target.closest(".stage-toolbar, .command-bar, .context-panel, .immersive-topbar, .stage-context-menu, .annotation-toggle")) return

      e.preventDefault()
      openMenuAt(e.clientX, e.clientY)
    }

    document.addEventListener("contextmenu", handleContextMenu)
    return () => document.removeEventListener("contextmenu", handleContextMenu)
  }, [openMenuAt])

  // Annotation mode: click on the overlay opens context menu
  useEffect(() => {
    if (!annotationMode) return

    function handleOverlayClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.classList.contains("stage-interaction-overlay--active")) return
      if (target.closest(".stage-context-menu")) return

      e.preventDefault()
      e.stopPropagation()
      openMenuAt(e.clientX, e.clientY)
    }

    document.addEventListener("click", handleOverlayClick, true)
    return () => document.removeEventListener("click", handleOverlayClick, true)
  }, [annotationMode, openMenuAt])

  // M key: open context menu at last known cursor position
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "m" && e.key !== "M") return
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return

      const stageShell = document.querySelector(".stage-shell")
      if (!stageShell) return

      const rect = stageShell.getBoundingClientRect()
      const cursor = lastCursorRef.current
      const inBounds =
        cursor.x >= rect.left &&
        cursor.x <= rect.right &&
        cursor.y >= rect.top &&
        cursor.y <= rect.bottom

      if (inBounds) {
        openMenuAt(cursor.x, cursor.y)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [openMenuAt])

  // Close on click outside or Escape
  useEffect(() => {
    if (!menuPos) return

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuPos(null)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuPos(null)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [menuPos])

  // Auto-focus label input when switching to add-marker view
  useEffect(() => {
    if (view === "add-marker" && labelInputRef.current) {
      labelInputRef.current.focus()
    }
  }, [view])

  const closeMenu = useCallback(() => {
    setMenuPos(null)
    setMenuIntersection(null)
  }, [])

  const handleAddMarker = useCallback(() => {
    setView("add-marker")
  }, [])

  const sdkConnected = status === "sdk-connected"

  const handleSaveMarker = useCallback(async () => {
    const intersection = menuIntersection
    if (!intersection || !label.trim() || !sdkConnected) return

    const position = { ...intersection.position }
    const resolvedRoomId = currentRoom?.id ?? ""
    const resolvedRoomName = roomName ?? currentRoom?.name ?? ""

    // Create 3D tag and capture its SDK ID
    const tagId = await bridge.addTag({
      label: label.trim(),
      description: description.trim(),
      anchorPosition: position,
      stemVector: { x: 0, y: 0.15, z: 0 },
      color: { r: 0.8, g: 0.69, b: 0.43 },
    })

    // Persist to API so the marker survives page reload
    let objectId: string | undefined
    try {
      const res = await fetch("/api/objects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          object: {
            title: label.trim(),
            description: description.trim(),
            aiSummary: description.trim(),
            position,
            spaceId,
            roomId: resolvedRoomId,
            roomName: resolvedRoomName,
            tagId: tagId ?? undefined,
            createdBy: "manual",
            status: "Needs Review",
            disposition: "Keep",
            type: "Manual Marker",
          },
        }),
      })
      if (res.ok) {
        const data = (await res.json()) as { created: Array<{ id: string }> }
        objectId = data.created?.[0]?.id
        window.dispatchEvent(new CustomEvent("objects-updated"))
      }
    } catch {
      // Best-effort — the 3D tag is already placed
    }

    // Register annotation in bridge, linking it to the SDK tag
    bridge.addAnnotation(
      {
        label: label.trim(),
        description: description.trim(),
        position,
        createdBy: "manual",
        spaceId,
        roomId: resolvedRoomId,
        roomName: resolvedRoomName,
        tagId: tagId ?? undefined,
        objectId,
        savedToApi: objectId !== undefined,
      },
      { skipTagSync: true, existingTagId: tagId ?? undefined }
    )

    setFeedback("\u2713")
    setTimeout(() => {
      closeMenu()
      onExitAnnotationMode()
    }, 600)
  }, [bridge, closeMenu, currentRoom, description, label, menuIntersection, onExitAnnotationMode, roomName, sdkConnected, spaceId])

  const handleDetectObjects = useCallback(() => {
    if (!allowObjectDetection) return
    window.dispatchEvent(new CustomEvent("auto-vision-analyze"))
    closeMenu()
    onExitAnnotationMode()
  }, [allowObjectDetection, closeMenu, onExitAnnotationMode])

  const handleNavigateHere = useCallback(async () => {
    const intersection = menuIntersection
    if (!intersection || !sdkConnected) return

    const targetPos = intersection.position
    const sweeps = bridge.sweeps

    if (sweeps.length === 0) {
      closeMenu()
      return
    }

    let nearestSid: string | null = null
    let nearestDist = Infinity

    for (const sweep of sweeps) {
      if (!sweep.enabled) continue
      const d = distanceSq(sweep.position, targetPos)
      if (d < nearestDist) {
        nearestDist = d
        nearestSid = sweep.sid
      }
    }

    if (nearestSid) {
      await bridge.navigateToSweep(nearestSid, { transition: "fly" })
    }

    closeMenu()
    onExitAnnotationMode()
  }, [bridge, closeMenu, menuIntersection, onExitAnnotationMode, sdkConnected])

  if (!menuPos) return null

  const intersection = menuIntersection
  const hasIntersection = intersection !== null && sdkConnected

  return (
    <div
      ref={menuRef}
      className="stage-context-menu"
      style={{ left: menuPos.x, top: menuPos.y }}
      role="menu"
    >
      {view === "actions" && (
        <>
          <button
            className="stage-context-menu__item"
            onClick={handleAddMarker}
            disabled={!allowMarkerCreation || !hasIntersection}
            role="menuitem"
          >
            <span aria-hidden="true">{"\uD83D\uDCCC"}</span>
            {t.contextMenu.addMarker}
          </button>
          <button
            className="stage-context-menu__item"
            onClick={handleDetectObjects}
            disabled={!allowObjectDetection}
            role="menuitem"
          >
            <span aria-hidden="true">{"\uD83D\uDD0D"}</span>
            {t.contextMenu.detectHere}
          </button>
          <div className="stage-context-menu__divider" />
          <button
            className="stage-context-menu__item"
            onClick={handleNavigateHere}
            disabled={!hasIntersection}
            role="menuitem"
          >
            <span aria-hidden="true">{"\uD83D\uDCCD"}</span>
            {t.contextMenu.navigateHere}
          </button>
          {hasIntersection && (
            <div className="stage-context-menu__coord" aria-label="coordinates">
              {intersection.position.x.toFixed(2)},{" "}
              {intersection.position.y.toFixed(2)},{" "}
              {intersection.position.z.toFixed(2)}
            </div>
          )}
        </>
      )}

      {view === "add-marker" && (
        <div className="stage-context-menu__form">
          {feedback ? (
            <div className="stage-context-menu__coord" style={{ textAlign: "center", fontSize: 18 }}>
              {feedback}
            </div>
          ) : (
            <>
              <input
                ref={labelInputRef}
                className="stage-context-menu__input"
                type="text"
                placeholder={t.contextMenu.markerLabel}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && label.trim()) {
                    handleSaveMarker()
                  }
                }}
              />
              <textarea
                className="stage-context-menu__input"
                rows={1}
                placeholder={t.contextMenu.markerDescription}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="stage-context-menu__form-actions">
                <button
                  className="stage-context-menu__form-btn"
                  onClick={() => setView("actions")}
                  type="button"
                >
                  {t.common.cancel}
                </button>
                <button
                  className="stage-context-menu__form-btn stage-context-menu__form-btn--primary"
                  onClick={handleSaveMarker}
                  disabled={!allowMarkerCreation || !label.trim() || !hasIntersection}
                  type="button"
                >
                  {t.contextMenu.place}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
