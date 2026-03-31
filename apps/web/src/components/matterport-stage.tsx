"use client"

import { useCallback, useEffect, useState } from "react"
import type { SpaceRecord } from "@/lib/platform-types"
import { getMatterportEmbedStatus, getMatterportEmbedUrl, getMatterportPreviewUrl } from "@/lib/matterport"
import { useBridge } from "@/lib/bridge-context"
import { useLocale } from "@/lib/i18n"
import type { ReactNode } from "react"
import { StageContextMenu } from "@/components/stage-context-menu"

export function MatterportStage({
  allowAnnotationMode = true,
  allowObjectDetection = true,
  children,
  space
}: {
  allowAnnotationMode?: boolean
  allowObjectDetection?: boolean
  children?: ReactNode
  space: SpaceRecord
}) {
  const embed = getMatterportEmbedStatus(space)
  const { bridge } = useBridge()
  const { locale, t } = useLocale()
  const [isLocal, setIsLocal] = useState(true)
  useEffect(() => {
    setIsLocal(/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname))
  }, [])
  const iframeSource = embed.modelSid
    ? isLocal
      ? getMatterportEmbedUrl(embed.modelSid, locale)
      : getMatterportPreviewUrl(embed.modelSid, locale)
    : null

  const [annotationMode, setAnnotationMode] = useState(false)

  const iframeRefCallback = useCallback(
    (node: HTMLIFrameElement | null) => {
      if (node) {
        bridge.attachIframe(node)
      } else {
        bridge.detach()
      }
    },
    [bridge]
  )

  const toggleAnnotationMode = useCallback(() => {
    setAnnotationMode((prev) => !prev)
  }, [])

  // ALT/Option key toggles annotation mode (works when parent document has focus)
  // Escape key exits annotation mode
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!allowAnnotationMode) return
      if (e.key === "Alt") {
        e.preventDefault()
        setAnnotationMode((prev) => !prev)
      }
      if (e.key === "Escape" && annotationMode) {
        setAnnotationMode(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [allowAnnotationMode, annotationMode])

  return (
    <section aria-label={t.matterportStage.immersiveStage} className="stage-shell">
      {embed.state === "connected" && iframeSource ? (
        <iframe
          allow="fullscreen; xr-spatial-tracking; accelerometer; gyroscope"
          className="stage-iframe"
          loading="eager"
          ref={iframeRefCallback}
          referrerPolicy="no-referrer"
          src={iframeSource}
          title={`${space.name} Matterport stage`}
        />
      ) : (
        <div className="stage-placeholder">
          <div className="stage-placeholder__glow" />
          <div className="stage-placeholder__copy">
            <h3>{t.matterportStage.readyTitle}</h3>
            <p>{t.matterportStage.readyBody}</p>
            <ul className="context-list">
              <li>Space id: {space.id}</li>
              <li>{t.matterportStage.configuredModel}: {embed.modelSid ?? t.matterportStage.notAvailable}</li>
              <li>{t.matterportStage.sdkKeyStatus}: {embed.sdkKeyStatus}</li>
            </ul>
          </div>
        </div>
      )}
      <div
        className={`stage-interaction-overlay${annotationMode ? " stage-interaction-overlay--active" : ""}`}
        aria-hidden="true"
      />
      <div className="stage-grid" aria-hidden="true" />
      <div className="stage-atmosphere" aria-hidden="true" />
      <div className="stage-vignette" aria-hidden="true" />

      {/* Annotation mode toggle button — always clickable regardless of iframe focus */}
      {allowAnnotationMode ? (
        <button
          className={`annotation-toggle${annotationMode ? " annotation-toggle--active" : ""}`}
          onClick={toggleAnnotationMode}
          type="button"
          aria-label={t.annotationMode.badge}
          title={t.annotationMode.hint}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </button>
      ) : null}

      {allowAnnotationMode && annotationMode ? (
        <div className="annotation-mode-badge" aria-live="polite">
          {t.annotationMode.badge}
          <span className="annotation-mode-badge__hint">{t.annotationMode.hint}</span>
        </div>
      ) : null}

      <StageContextMenu
        allowMarkerCreation={allowAnnotationMode}
        allowObjectDetection={allowObjectDetection}
        spaceId={space.id}
        annotationMode={annotationMode}
        onExitAnnotationMode={() => setAnnotationMode(false)}
      />
      {children}
    </section>
  )
}
