import { getProviderProfiles } from "@/lib/mock-data"
import { toToneToken } from "@/lib/presentation"

export default function ProviderSettingsPage() {
  const providers = getProviderProfiles()

  return (
    <main className="settings-shell" id="main-content">
      <section className="section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Provider controls</p>
            <h1>Model routing is configurable, but keys never leave the backend.</h1>
          </div>
          <p>
            This view is the UX contract for multi-provider onboarding. Actual secrets are stored
            server-side and should be encrypted at rest with tenant-scoped audit logging.
          </p>
        </div>
        <div className="provider-settings-grid">
          {providers.map((provider) => (
            <article className="provider-card" key={provider.id}>
              <header className="provider-card__header">
                <div>
                  <p className="eyebrow">{provider.label}</p>
                  <h2>{provider.specialty}</h2>
                </div>
                <span className={`pill pill--${toToneToken(provider.status)}`}>{provider.status}</span>
              </header>
              <dl className="provider-card__facts">
                <div>
                  <dt>Best for</dt>
                  <dd>{provider.bestFor.join(", ")}</dd>
                </div>
                <div>
                  <dt>Fallback class</dt>
                  <dd>{provider.fallbackClass}</dd>
                </div>
                <div>
                  <dt>Credential posture</dt>
                  <dd>Masked in UI, versioned on the server, approval-gated on change.</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
