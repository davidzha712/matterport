"use client"

import type { ChangeEvent } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { AnnotationOverlay } from "@/components/annotation-overlay"
import { useBridge } from "@/lib/bridge-context"
import { useT } from "@/lib/i18n"
import type { CameraPose } from "@/lib/matterport-bridge"
import type { SpatialAnnotation } from "@/lib/platform-types"
import { Badge } from "@/components/ui/badge"

type AIDetectedItem = {
  bbox?: [number, number, number, number] | null
  category?: string
  color?: { r: number; g: number; b: number }
  confidence?: number
  description?: string
  label: string
  material?: string
  era?: string
  condition?: string
  estimatedValue?: { min?: number; max?: number; currency?: string }
}

type AnnotationsBatchDetail = {
  items: AIDetectedItem[]
  screenshotPose?: CameraPose | null
  spaceId?: string
  roomId?: string
  roomName?: string
}

// Default screenshot resolution used by bridge.captureScreenshot()
const SCREENSHOT_RES = { width: 1920, height: 1080 }

// Distance threshold for deduplication (meters)
const DEDUP_DISTANCE_M = 0.5

function distance3d(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

type StageControlsProps = {
  spaceId: string
}

export function StageControls({ spaceId }: StageControlsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [annotations, setAnnotations] = useState<SpatialAnnotation[]>([])
  const [captureHint, setCaptureHint] = useState<string | null>(null)
  const { bridge, status } = useBridge()
  const t = useT()
  const loadedFromApiRef = useRef(false)

  useEffect(() => {
    const unsubscribe = bridge.subscribe((next) => {
      setAnnotations(next)
    })
    return unsubscribe
  }, [bridge])

  // Listen for screenshot events from StageToolbar to show hint
  useEffect(() => {
    function onScreenshot() {
      setCaptureHint(t.stage.screenshotTaken)
      setTimeout(() => setCaptureHint(null), 2000)
    }
    window.addEventListener("matterport-screenshot", onScreenshot)
    return () => window.removeEventListener("matterport-screenshot", onScreenshot)
  }, [t])

  const handleFileCapture = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        window.dispatchEvent(
          new CustomEvent("matterport-screenshot", { detail: { dataUrl: reader.result } })
        )
        setCaptureHint(t.stage.screenshotTaken)
        setTimeout(() => setCaptureHint(null), 3000)
      }
    }
    reader.readAsDataURL(file)
  }, [t])

  const handleAddAnnotation = useCallback(
    (data: Omit<SpatialAnnotation, "id">) => {
      bridge.addAnnotation(data)
    },
    [bridge]
  )

  const handleUpdateAnnotation = useCallback(
    (id: string, updates: Partial<Omit<SpatialAnnotation, "id">>) => {
      bridge.updateAnnotation(id, updates)
    },
    [bridge]
  )

  const handleFocusTag = useCallback(
    (tagId: string) => {
      void bridge.navigateToTag(tagId)
    },
    [bridge]
  )

  const handleRemoveAnnotation = useCallback(
    async (id: string) => {
      // Find the annotation to get its API objectId before removing
      const ann = bridge.getAnnotations().find((a) => a.id === id)
      bridge.removeAnnotation(id)

      // Also delete from API if it was persisted
      if (ann?.objectId) {
        try {
          await fetch(`/api/objects?id=${encodeURIComponent(ann.objectId)}`, {
            method: "DELETE",
          })
          window.dispatchEvent(new CustomEvent("objects-updated"))
        } catch {
          // Best-effort
        }
      }
    },
    [bridge]
  )

  // ─── Load persisted objects from API on SDK connect ───
  useEffect(() => {
    if (status !== "sdk-connected" || loadedFromApiRef.current) return
    loadedFromApiRef.current = true

    async function loadFromApi() {
      try {
        const res = await fetch(`/api/objects?spaceId=${encodeURIComponent(spaceId)}`)
        if (!res.ok) return
        const data = (await res.json()) as { objects: Array<Record<string, unknown>> }
        if (!Array.isArray(data.objects) || data.objects.length === 0) return

        for (const obj of data.objects) {
          const pos = obj.position as { x: number; y: number; z: number } | undefined
          if (!pos) continue

          // Create SDK tag at persisted position
          const tagId = await bridge.addTag({
            label: String(obj.title ?? ""),
            description: String(obj.description ?? obj.aiSummary ?? ""),
            anchorPosition: pos,
            stemVector: { x: 0, y: 0.2, z: 0 },
          })

          // Add as local annotation (skip creating another SDK tag)
          bridge.addAnnotation(
            {
              label: String(obj.title ?? ""),
              description: String(obj.description ?? obj.aiSummary ?? ""),
              position: pos,
              createdBy: (obj.createdBy as "ai" | "manual") ?? "ai",
              confidence: typeof obj.confidence === "number" ? obj.confidence : undefined,
              category: typeof obj.category === "string" ? obj.category : undefined,
              material: typeof obj.material === "string" ? obj.material : undefined,
              condition: typeof obj.condition === "string" ? (obj.condition as SpatialAnnotation["condition"]) : undefined,
              estimatedValue: obj.estimatedValue as SpatialAnnotation["estimatedValue"],
              roomId: typeof obj.roomId === "string" ? obj.roomId : undefined,
              roomName: typeof obj.roomName === "string" ? obj.roomName : undefined,
              spaceId: typeof obj.spaceId === "string" ? obj.spaceId : undefined,
              tagId: tagId ?? undefined,
              objectId: typeof obj.id === "string" ? obj.id : undefined,
              savedToApi: true,
            },
            { skipTagSync: true, existingTagId: tagId ?? undefined }
          )

          // Small delay between tags to avoid SDK batching issues
          await new Promise((r) => setTimeout(r, 80))
        }

        if (data.objects.length > 0) {
          setCaptureHint(`Restored ${data.objects.length} objects from database`)
          setTimeout(() => setCaptureHint(null), 4000)
        }
      } catch {
        // Best-effort — don't block UI
      }
    }

    void loadFromApi()
  }, [bridge, spaceId, status])

  // ─── AI batch annotation with 2D→3D projection ───
  const processingRef = useRef(false)

  useEffect(() => {
    async function handleBatch(event: Event) {
      const detail = (event as CustomEvent<AnnotationsBatchDetail>).detail
      if (!detail?.items?.length) return
      if (processingRef.current) return
      processingRef.current = true

      const savedPose = detail.screenshotPose ?? null
      const batchSpaceId = detail.spaceId ?? ""
      const batchRoomId = detail.roomId ?? ""
      const batchRoomName = detail.roomName ?? ""
      let placed = 0
      let projected = 0
      let skippedDupes = 0
      const objectsToSave: Array<Record<string, unknown>> = []

      for (const item of detail.items) {
        if (!item.label) continue

        let anchorPosition: { x: number; y: number; z: number } | null = null

        // Try 2D→3D projection using saved camera pose from screenshot time
        if (item.bbox && item.bbox.length === 4) {
          anchorPosition = await bridge.bboxToWorldPosition(item.bbox, SCREENSHOT_RES, savedPose)
          if (anchorPosition) projected++
        }

        // Deduplication: skip if an existing annotation is within threshold distance
        if (anchorPosition) {
          const existing = bridge.getAnnotations()
          const isDuplicate = existing.some(
            (ann) => distance3d(ann.position, anchorPosition!) < DEDUP_DISTANCE_M
          )
          if (isDuplicate) {
            skippedDupes++
            continue
          }
        }

        // Fallback: place at camera forward direction
        let tagId: string | null = null
        if (!anchorPosition) {
          tagId = await bridge.addTagAtCurrentView(
            item.label,
            item.description ?? "",
            item.color
          )
          anchorPosition = bridge.getCameraPose()?.position ?? { x: 0, y: 0, z: 0 }
        } else {
          // Have a projected position — create the 3D tag at the exact spot
          tagId = await bridge.addTag({
            label: item.label,
            description: item.description ?? "",
            anchorPosition,
            stemVector: { x: 0, y: 0.2, z: 0 },
            color: item.color,
          })
        }

        // Add to local annotation overlay WITHOUT creating another SDK tag
        bridge.addAnnotation(
          {
            label: item.label,
            description: item.description ?? "",
            position: anchorPosition,
            createdBy: "ai",
            confidence: item.confidence,
            category: item.category,
            roomId: batchRoomId,
            roomName: batchRoomName,
            spaceId: batchSpaceId,
            tagId: tagId ?? undefined,
          },
          { skipTagSync: true, existingTagId: tagId ?? undefined }
        )

        // Collect for API persistence
        objectsToSave.push({
          title: item.label,
          description: item.description ?? "",
          type: item.category ?? "Unknown",
          category: item.category,
          confidence: item.confidence,
          material: item.material,
          era: item.era,
          condition: item.condition,
          estimatedValue: item.estimatedValue,
          position: anchorPosition,
          tagId,
          spaceId: batchSpaceId,
          roomId: batchRoomId,
          roomName: batchRoomName,
          createdBy: "ai",
        })

        placed++
        setCaptureHint(`Placing: ${placed}/${detail.items.length}`)

        // Small delay between tags to avoid API batching issues
        await new Promise((r) => setTimeout(r, 120))
      }

      // Persist to API in batch and store API IDs back on annotations
      if (objectsToSave.length > 0) {
        try {
          const res = await fetch("/api/objects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ objects: objectsToSave }),
          })
          if (res.ok) {
            const data = (await res.json()) as { created: Array<{ id: string; tagId?: string }> }
            // Map API object IDs back to annotations via tagId matching
            for (const saved of data.created) {
              if (!saved.tagId) continue
              const ann = bridge.getAnnotations().find((a) => a.tagId === saved.tagId)
              if (ann) {
                bridge.updateAnnotation(ann.id, { objectId: saved.id, savedToApi: true })
              }
            }
          }
        } catch {
          // Persistence is best-effort — tags are already placed
        }
      }

      if (placed > 0) {
        const parts: string[] = []
        parts.push(`${placed} objects annotated`)
        if (projected > 0) parts.push(`${projected} projected to 3D`)
        if (skippedDupes > 0) parts.push(`${skippedDupes} duplicates skipped`)
        setCaptureHint(parts.join(" — "))
        setTimeout(() => setCaptureHint(null), 5000)
        // Notify other components that objects were saved
        window.dispatchEvent(new CustomEvent("objects-updated"))
      }

      processingRef.current = false
    }

    window.addEventListener("annotations-from-ai", handleBatch)
    return () => window.removeEventListener("annotations-from-ai", handleBatch)
  }, [bridge])

  return (
    <>
      <input
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileCapture}
        ref={fileInputRef}
        type="file"
      />
      {captureHint ? (
        <div className="stage-capture-hint">
          <Badge aria-live="polite" variant="secondary">
            {captureHint}
          </Badge>
        </div>
      ) : null}

      <AnnotationOverlay
        annotations={annotations}
        bridgeStatus={status}
        onAdd={handleAddAnnotation}
        onFocusTag={handleFocusTag}
        onRemove={handleRemoveAnnotation}
        onUpdate={handleUpdateAnnotation}
      />
    </>
  )
}
