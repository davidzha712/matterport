"use client"

import type { ChangeEvent } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { AnnotationOverlay } from "@/components/annotation-overlay"
import { useBridge } from "@/lib/bridge-context"
import { useT } from "@/lib/i18n"
import type { SpatialAnnotation } from "@/lib/platform-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type AnnotationFromAIDetail = {
  description?: string
  label: string
}

export function StageControls() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [annotations, setAnnotations] = useState<SpatialAnnotation[]>([])
  const [captureHint, setCaptureHint] = useState<string | null>(null)
  const { bridge, status } = useBridge()
  const t = useT()

  useEffect(() => {
    const unsubscribe = bridge.subscribe((next) => {
      setAnnotations(next)
    })
    return unsubscribe
  }, [bridge])

  const handleCaptureClick = useCallback(async () => {
    const screenshot = await bridge.captureScreenshot()
    if (screenshot) {
      setCaptureHint(t.stage.screenshotTaken)
      window.dispatchEvent(
        new CustomEvent("matterport-screenshot", { detail: { dataUrl: screenshot } })
      )
      setTimeout(() => setCaptureHint(null), 2000)
    } else {
      fileInputRef.current?.click()
    }
  }, [bridge, t])

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

  const handleRemoveAnnotation = useCallback(
    (id: string) => {
      bridge.removeAnnotation(id)
    },
    [bridge]
  )

  useEffect(() => {
    function onAnnotationFromAI(event: Event) {
      const detail = (event as CustomEvent<AnnotationFromAIDetail>).detail
      if (!detail?.label) return
      bridge.addAnnotation({
        label: detail.label,
        description: detail.description ?? "",
        position: { x: 0, y: 0, z: 0 },
        createdBy: "ai"
      })
    }

    window.addEventListener("annotation-from-ai", onAnnotationFromAI)
    return () => {
      window.removeEventListener("annotation-from-ai", onAnnotationFromAI)
    }
  }, [bridge])

  return (
    <>
      <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2">
        <Button
          onClick={() => void handleCaptureClick()}
          size="sm"
          title={t.stage.captureView}
          variant="outline"
        >
          {t.stage.captureView}
        </Button>
        <input
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleFileCapture}
          ref={fileInputRef}
          type="file"
        />
        {captureHint ? (
          <Badge aria-live="polite" variant="secondary">
            {captureHint}
          </Badge>
        ) : null}
      </div>

      <AnnotationOverlay
        annotations={annotations}
        bridgeStatus={status}
        onAdd={handleAddAnnotation}
        onRemove={handleRemoveAnnotation}
        onUpdate={handleUpdateAnnotation}
      />
    </>
  )
}
