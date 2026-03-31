import Link from "next/link"
import { getRuntimeProjects } from "@/lib/platform-service"
import { getWorkflowReadiness } from "@/lib/workflow-readiness"
import { buildSpaceRoute } from "@/lib/routes"

export default async function ExportCenterPage() {
  const projects = await getRuntimeProjects()
  const spaces = projects.flatMap((project) =>
    project.spaces.map((space) => ({
      projectName: project.name,
      readiness: getWorkflowReadiness(space),
      space,
    })),
  )
  const readySpaces = spaces.filter((entry) => entry.readiness.exportReady).length

  return (
    <main className="detail-shell" id="main-content">
      <header className="detail-header">
        <div>
          <p className="eyebrow">Export Center</p>
          <h1>Datenbereitstellung und Archivierung.</h1>
          <p>Exportieren Sie Inventare, Zustandsberichte und kuratorische Dossiers in standardisierte Formate.</p>
        </div>
        <div className="detail-header__actions">
          <Link className="button button--secondary" href="/">
            Zur Uebersicht
          </Link>
        </div>
      </header>

      <section className="section-grid">
        <div className="section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Bulk Actions</p>
              <h2>Globaler Export</h2>
            </div>
          </div>
          <p>
            {readySpaces === spaces.length
              ? "Alle Spaces sind exportbereit. Der globale Export laeuft im strict approval-gated Modus."
              : `${readySpaces} von ${spaces.length} Spaces sind exportbereit. Blockierte Spaces muessen zuerst im Review abgeschlossen werden.`}
          </p>
          <div className="action-matrix">
            {readySpaces === spaces.length ? (
              <a
                className="button button--primary"
                href="/api/export/all/csv?strict=true"
                download
              >
                Alle Objekte (CSV)
              </a>
            ) : (
              <Link className="button button--primary" href="/review-center">
                Offene Reviews abschliessen
              </Link>
            )}
            <Link className="button button--secondary" href="/review-center">
              Review Center oeffnen
            </Link>
          </div>
        </div>

        <aside className="section-card section-card--narrow">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Standards</p>
              <h2>Formate</h2>
            </div>
          </div>
          <ul className="context-list">
            <li><strong>CSV:</strong> Standard-Tabellenformat fuer Excel/Numbers.</li>
            <li><strong>PDF:</strong> (Geplant) Druckfertige Dossiers mit Bildern.</li>
            <li><strong>IIIF:</strong> Manifest-Export fuer freigegebene Museums-/Story-Spaces.</li>
          </ul>
        </aside>
      </section>

      <section className="section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Projektbasiert</p>
            <h2>Nach Projekt und Space exportieren</h2>
          </div>
        </div>
        
        <div className="project-grid">
          {spaces.map(({ projectName, readiness, space }) => (
            <div key={space.id} className="project-card export-project-card">
              <div className="review-card__header">
                <div>
                  <p className="eyebrow">{projectName}</p>
                  <h3>{space.name}</h3>
                </div>
                <span className={`pill ${readiness.exportReady ? "pill--active" : "pill--needs-review"}`}>
                  {readiness.exportReady ? "Export bereit" : `${readiness.pendingReviewCount} offen`}
                </span>
              </div>
              <ul className="context-list">
                <li>{space.objects.length} Objekte</li>
                <li>{readiness.approvedCount} freigegeben</li>
                <li>{readiness.pendingReviewCount} in Review</li>
              </ul>
              <div className="action-matrix">
                {readiness.exportReady ? (
                  <a
                    className="button button--primary"
                    href={`/api/export/spaces/${space.id}/csv?strict=true`}
                    download
                  >
                    CSV
                  </a>
                ) : (
                  <Link className="button button--secondary" href={buildSpaceRoute(space.id, "review")}>
                    Review oeffnen
                  </Link>
                )}
                {readiness.publishReady ? (
                  <a
                    className="button button--secondary"
                    href={`/api/export/spaces/${space.id}/iiif-manifest?strict=true`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    IIIF Manifest
                  </a>
                ) : (
                  <span className="pill pill--needs-review">Publikation blockiert</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
