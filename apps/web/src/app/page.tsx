import Link from "next/link"
import { ProjectOverviewCard } from "@/components/project-overview-card"
import { getRuntimeProjects, getRuntimeReviewQueue } from "@/lib/platform-service"
import { getRuntimeProviderProfiles } from "@/lib/provider-service"
import { toDisplayDisposition, toDisplayPriority, toDisplayWorkflowStatus, toToneToken } from "@/lib/presentation"
import { buildObjectRoute, buildSpaceRoute } from "@/lib/routes"

export default async function HomePage() {
  const [projects, providers, reviewQueue] = await Promise.all([
    getRuntimeProjects(),
    getRuntimeProviderProfiles(),
    getRuntimeReviewQueue()
  ])
  const featuredSpace = projects[0]?.spaces[0]
  const totalSpaces = projects.reduce((total, project) => total + project.spaces.length, 0)
  const totalObjects = projects.reduce(
    (projectTotal, project) =>
      projectTotal + project.spaces.reduce((spaceTotal, space) => spaceTotal + space.objects.length, 0),
    0
  )

  return (
    <main className="home-shell" id="main-content">
      <section className="hero-panel hero-panel--immersive">
        <div className="hero-panel__veil" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow">Primaersprache Deutsch, Englisch folgt</p>
          <h1>Immersive Wissensraeume fuer Nachlaesse und Sammlungen.</h1>
          <h2 className="hero-copy__headline">
            Matterport wird zur Buehne, KI zur Wissens- und Workflow-Schicht.
          </h2>
          <p className="hero-copy__body">
            Das hier ist keine gewoehnliche Projektseite. Es ist eine wiederverwendbare immersive
            Plattform: Matterport als raeumliche Buehne, strukturierte Objektidentitaet als
            Wissensschicht und geroutete multimodale KI als operativer Copilot.
          </p>
          <div className="hero-actions">
            {featuredSpace ? (
              <Link className="button button--primary" href={buildSpaceRoute(featuredSpace.id)}>
                Live-Space betreten
              </Link>
            ) : null}
            <Link className="button button--secondary" href="/review-center">
              Review Center
            </Link>
            <Link className="button button--secondary" href="/settings/providers">
              Provider-Konfiguration pruefen
            </Link>
          </div>
          <div className="entry-matrix" aria-label="Primaere Plattformzugriffe">
            <article className="entry-card">
              <p className="eyebrow">Explorer</p>
              <h3>Full-screen Space Explorer</h3>
              <p>Raeumliche Orientierung mit rechter Wissensschicht und unterer Modusnavigation.</p>
            </article>
            <article className="entry-card">
              <p className="eyebrow">Objektebene</p>
              <h3>Dossiers statt Hotspots</h3>
              <p>Jedes Objekt bekommt Status, Story, Notizen, Provenienz und spaetere IIIF-Layer.</p>
            </article>
            <article className="entry-card">
              <p className="eyebrow">Workflow</p>
              <h3>Review first</h3>
              <p>Menschliche Freigaben bleiben verbindlich, KI liefert nur analysierbare Vorschlaege.</p>
            </article>
          </div>
        </div>
        <div className="hero-sidebar" aria-label="Plattformstatus">
          <div className="hero-metrics hero-metrics--stacked">
            <div className="metric-card">
              <span>Projekte</span>
              <strong>{projects.length}</strong>
            </div>
            <div className="metric-card">
              <span>Spaces</span>
              <strong>{totalSpaces}</strong>
            </div>
            <div className="metric-card">
              <span>Review Queue</span>
              <strong>{reviewQueue.length}</strong>
            </div>
            <div className="metric-card metric-card--wide">
              <span>Objekte</span>
              <strong>{totalObjects}</strong>
              <p>Review-first modelliert, mehrprojektfaehig und spaeter exportierbar.</p>
            </div>
          </div>

          {featuredSpace ? (
            <div className="hero-preview">
              <div className="hero-preview__header">
                <div>
                  <p className="eyebrow">Aktive Buehne</p>
                  <h3>{featuredSpace.name}</h3>
                </div>
                <span className="pill pill--active">Matterport live</span>
              </div>
              <p>{featuredSpace.summary}</p>
              <ul className="hero-preview__chips">
                <li>Erkunden</li>
                <li>Story</li>
                <li>Pruefen</li>
                <li>Listing</li>
              </ul>
              <ul className="hero-preview__facts">
                {featuredSpace.rooms.slice(0, 3).map((room) => (
                  <li key={room.id}>
                    <strong>{room.name}</strong>
                    <span>{room.objectIds.length} Objekte</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section className="section-grid">
        <div className="section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Portfolio</p>
              <h2>Projektlandschaft</h2>
            </div>
            <p>
              Jedes Projekt kann mehrere Matterport-Spaces, Objektlagen, Review-Regeln und
              Erzaehlpfade fuehren.
            </p>
          </div>
          <div className="project-grid">
            {projects.map((project) => (
              <ProjectOverviewCard key={project.id} project={project} />
            ))}
          </div>
        </div>

        <aside className="section-card section-card--narrow">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Review Center</p>
              <h2>Offene Entscheidungen</h2>
            </div>
            <p>Menschen pruefen, Modelle beschleunigen. Diese Liste kommt jetzt aus dem Backend.</p>
          </div>
          <ul className="review-queue-list" aria-label="Pending review items">
            {reviewQueue.slice(0, 4).map((item) => (
              <li key={item.objectId}>
                <Link href={buildObjectRoute(item.spaceId, item.objectId)}>
                  <div>
                    <strong>{item.objectTitle}</strong>
                    <p>
                      {item.projectName} · {item.spaceName} · {item.roomName}
                    </p>
                  </div>
                  <div className="review-queue-list__meta">
                    <span className="pill pill--needs-review">{toDisplayWorkflowStatus(item.status)}</span>
                    <small>
                      {toDisplayPriority(item.priorityBand)} · {toDisplayDisposition(item.disposition)}
                    </small>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="section-heading section-heading--compact">
            <div>
              <p className="eyebrow">Routing</p>
              <h2>Modellpolitik</h2>
            </div>
            <p>Provider bleiben serverseitig; die UI zeigt nur Status und Einsatzklasse.</p>
          </div>
          <ul className="provider-list" aria-label="Configured providers">
            {providers.map((provider) => (
              <li key={provider.id} className="provider-list__item">
                <div>
                  <strong>{provider.label}</strong>
                  <p>{provider.specialty}</p>
                </div>
                <div className="provider-list__meta">
                  <span className={`pill pill--${toToneToken(provider.status)}`}>
                    {toDisplayWorkflowStatus(provider.status)}
                  </span>
                  <small>{provider.configured ? "Verbunden" : "Noch nicht hinterlegt"}</small>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </main>
  )
}
