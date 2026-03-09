"use client"

import { useEffect, useState } from "react"
import { useLocale } from "@/lib/i18n"

type ProgressData = {
  step: string
  progress: number
}

const STEP_LABELS: Record<string, Record<string, string>> = {
  de: {
    init: "Vorbereitung…",
    search: "Web-Kontext wird gesucht…",
    vlm: "VLM-Bildanalyse…",
    parse: "Ergebnisse werden geparst…",
    placing: "3D-Tags werden platziert…",
    done: "Analyse abgeschlossen",
    error: "Analyse fehlgeschlagen",
  },
  en: {
    init: "Initializing…",
    search: "Searching web context…",
    vlm: "Analyzing image with VLM…",
    parse: "Parsing detection results…",
    placing: "Placing 3D annotations…",
    done: "Analysis complete",
    error: "Analysis failed",
  },
}

export function AIProgressOverlay() {
  const { locale } = useLocale()
  const [progress, setProgress] = useState<ProgressData | null>(null)

  useEffect(() => {
    function onProgress(event: Event) {
      const data = (event as CustomEvent<ProgressData | null>).detail
      setProgress(data)
    }

    window.addEventListener("ai-analysis-progress", onProgress)
    return () => window.removeEventListener("ai-analysis-progress", onProgress)
  }, [])

  if (!progress) return null

  const labels = STEP_LABELS[locale] ?? STEP_LABELS.en
  const stepLabel = labels[progress.step] ?? progress.step

  return (
    <div className="ai-progress-overlay" aria-live="polite">
      <div className="ai-progress-overlay__content">
        <div className="ai-progress-overlay__bar">
          <div
            className="ai-progress-overlay__fill"
            style={{ width: `${progress.progress}%` }}
          />
        </div>
        <div className="ai-progress-overlay__info">
          <span className="ai-progress-overlay__step">{stepLabel}</span>
          <span className="ai-progress-overlay__pct">{progress.progress}%</span>
        </div>
      </div>
    </div>
  )
}
