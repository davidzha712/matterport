"use client"

import { useCallback } from "react"
import type { SpaceRecord } from "@/lib/platform-types"
import { getMatterportEmbedStatus, getMatterportEmbedUrl } from "@/lib/matterport"
import { useBridge } from "@/lib/bridge-context"
import { useT } from "@/lib/i18n"
import type { ReactNode } from "react"

export function MatterportStage({
  children,
  space
}: {
  children?: ReactNode
  space: SpaceRecord
}) {
  const embed = getMatterportEmbedStatus(space)
  const iframeSource = embed.modelSid ? getMatterportEmbedUrl(embed.modelSid) : null
  const { bridge } = useBridge()
  const t = useT()

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

  return (
    <section aria-label={t.matterportStage.immersiveStage} className="stage-shell">
      {embed.state === "connected" && iframeSource ? (
        <iframe
          allow="fullscreen; xr-spatial-tracking; accelerometer; gyroscope"
          className="stage-iframe"
          loading="eager"
          ref={iframeRefCallback}
          referrerPolicy="strict-origin-when-cross-origin"
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
      <div className="stage-grid" aria-hidden="true" />
      <div className="stage-atmosphere" aria-hidden="true" />
      <div className="stage-vignette" aria-hidden="true" />
      {children}
    </section>
  )
}
