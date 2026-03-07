import { getRuntimeProviderProfiles } from "@/lib/provider-service"
import { toDisplayWorkflowStatus, toToneToken } from "@/lib/presentation"

export default async function ProviderSettingsPage() {
  const providers = await getRuntimeProviderProfiles()
  const configuredCount = providers.filter((provider) => provider.configured).length

  return (
    <main className="settings-shell" id="main-content">
      <section className="section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Provider-Steuerung</p>
            <h1>Modellrouting ist konfigurierbar, aber Schluessel verlassen nie das Backend.</h1>
          </div>
          <p>
            Diese Ansicht ist der UX-Vertrag fuer Multi-Provider-Onboarding. Secrets bleiben
            serverseitig, verschluesselt und revisionsfaehig.
          </p>
        </div>
        <div className="context-banner">
          <p className="eyebrow">Aktueller Zustand</p>
          <h2>{configuredCount} von {providers.length} Providern sind fuer das Routing bereit.</h2>
          <p>
            Fuer lokale Entwicklung reicht ein Eintrag in `.env.local`. Die UI zeigt nur
            Verbindungsstatus, keine Keys.
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
                <span className={`pill pill--${toToneToken(provider.status)}`}>
                  {toDisplayWorkflowStatus(provider.status)}
                </span>
              </header>
              <dl className="provider-card__facts">
                <div>
                  <dt>Geeignet fuer</dt>
                  <dd>{provider.bestFor.join(", ")}</dd>
                </div>
                <div>
                  <dt>Fallback-Klasse</dt>
                  <dd>{provider.fallbackClass}</dd>
                </div>
                <div>
                  <dt>Key-Status</dt>
                  <dd>{provider.configured ? "Verbunden und backendseitig nutzbar." : "Noch nicht im Backend hinterlegt."}</dd>
                </div>
                <div>
                  <dt>Governance</dt>
                  <dd>Maskiert in der UI, versioniert auf dem Server, freigabepflichtig bei Aenderung.</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
