"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type IIIFViewerProps = {
  imageUrl?: string
  title?: string
}

export function IIIFViewer({ imageUrl, title }: IIIFViewerProps) {
  const [isZoomed, setIsZoomed] = useState(false)

  // Placeholder image if none provided
  const src = imageUrl || "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&q=80&w=1000"

  return (
    <div className="flex h-full min-h-[400px] w-full flex-col gap-4">
      <button
        className={cn(
          "relative flex flex-1 items-center justify-center overflow-hidden rounded-lg border-0 bg-[#1a1a1a]",
          isZoomed ? "cursor-zoom-out" : "cursor-zoom-in"
        )}
        onClick={() => setIsZoomed(!isZoomed)}
        aria-label={isZoomed ? "Zoom out" : "Zoom in"}
        type="button"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={title || "Object detail"}
          className={cn(
            "max-h-full max-w-full object-contain transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            isZoomed && "scale-[2.5]"
          )}
          height={1000}
          src={src}
          width={1600}
        />

        {!isZoomed && (
          <div className="pointer-events-none absolute bottom-4 left-4 rounded bg-black/60 px-3 py-2 text-white">
            <Badge variant="secondary">Deep Zoom aktiv</Badge>
            <p className="text-sm">Klicken zum Vergroessern</p>
          </div>
        )}
      </button>

      <div className="flex items-center justify-between rounded bg-white/[0.05] p-2">
        <Button
          onClick={() => setIsZoomed(!isZoomed)}
          variant="secondary"
        >
          {isZoomed ? "Uebersicht" : "Details ansehen"}
        </Button>
        <div className="flex flex-col items-end text-xs opacity-70">
          <small>IIIF Manifest v3.0</small>
          <span>Region: {isZoomed ? "Full Detail" : "Overview"}</span>
        </div>
      </div>
    </div>
  )
}
