import type { SpaceRecord } from "@/lib/mock-data"
import { getMatterportEmbedStatus, getMatterportEmbedUrl } from "@/lib/matterport"
import { toToneToken } from "@/lib/presentation"

export function MatterportStage({ space }: { space: SpaceRecord }) {
  const embed = getMatterportEmbedStatus(space)
  const iframeSource = embed.modelSid ? getMatterportEmbedUrl(embed.modelSid) : null

  return (
    <section aria-label="Immersive stage" className="stage-shell">
      <div className="stage-shell__header">
        <div>
          <p className="eyebrow">Matterport stage</p>
          <h2>{space.name}</h2>
        </div>
        <span className={`pill pill--${toToneToken(embed.state)}`}>{embed.label}</span>
      </div>

      {embed.state === "connected" && iframeSource ? (
        <iframe
          allow="fullscreen; xr-spatial-tracking"
          className="stage-iframe"
          src={iframeSource}
          title={`${space.name} Matterport stage`}
        />
      ) : (
        <div className="stage-placeholder">
          <div className="stage-placeholder__glow" />
          <div className="stage-placeholder__copy">
            <h3>Framework ready for a live Matterport model.</h3>
            <p>
              Add a model SID and SDK key in `.env.local` to switch this stage from design-mode
              placeholder to live immersive embed.
            </p>
            <ul className="context-list">
              <li>Space id: {space.id}</li>
              <li>Configured model: {embed.modelSid ?? "not available"}</li>
              <li>SDK key status: {embed.sdkKeyStatus}</li>
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}
