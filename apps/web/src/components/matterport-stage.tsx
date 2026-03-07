import type { SpaceRecord } from "@/lib/mock-data"
import { getMatterportEmbedStatus, getMatterportEmbedUrl } from "@/lib/matterport"
import { toToneToken } from "@/lib/presentation"
import type { ReactNode } from "react"

export function MatterportStage({
  children,
  space
}: {
  children?: ReactNode
  space: SpaceRecord
}) {
  const embed = getMatterportEmbedStatus(space)
  const sdkKey = process.env.NEXT_PUBLIC_MATTERPORT_SDK_KEY
  const iframeSource = embed.modelSid ? getMatterportEmbedUrl(embed.modelSid, sdkKey) : null
  const stageSignals = [
    `Projekt: ${space.projectName}`,
    embed.state === "connected" ? "Matterport live" : "Design mode",
    `${space.rooms.length} Raeume / ${space.objects.length} Objekte`
  ]

  return (
    <section aria-label="Immersive Stage" className="stage-shell">
      {embed.state === "connected" && iframeSource ? (
        <iframe
          allow="fullscreen; xr-spatial-tracking"
          className="stage-iframe"
          loading="eager"
          src={iframeSource}
          title={`${space.name} Matterport stage`}
        />
      ) : (
        <div className="stage-placeholder">
          <div className="stage-placeholder__glow" />
          <div className="stage-placeholder__copy">
            <h3>Die Plattform ist bereit fuer einen live geschalteten Matterport Space.</h3>
            <p>
              Hinterlege Model-SID und SDK-Key in `.env.local`, damit diese Stage vom
              Design-Modus auf die immersive Live-Ansicht umschaltet.
            </p>
            <ul className="context-list">
              <li>Space id: {space.id}</li>
              <li>Konfiguriertes Modell: {embed.modelSid ?? "nicht vorhanden"}</li>
              <li>SDK-Key-Status: {embed.sdkKeyStatus}</li>
            </ul>
          </div>
        </div>
      )}
      <div className="stage-grid" aria-hidden="true" />
      <div className="stage-atmosphere" aria-hidden="true" />
      <div className="stage-vignette" aria-hidden="true" />
      <div className="stage-meta">
        <p className="eyebrow">Matterport Stage</p>
        <div className="stage-meta__row">
          <h2>{space.name}</h2>
          <span className={`pill pill--${toToneToken(embed.state)}`}>{embed.label}</span>
        </div>
        <p className="stage-meta__copy">
          {space.summary}
        </p>
        <ul className="stage-signal-strip">
          {stageSignals.map((signal) => (
            <li key={signal}>{signal}</li>
          ))}
        </ul>
      </div>
      {children}
    </section>
  )
}
