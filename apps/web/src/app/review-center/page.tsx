import Link from "next/link"
import { getRuntimeProjects, getRuntimeReviewQueue } from "@/lib/platform-service"
import { getWorkflowReadiness } from "@/lib/workflow-readiness"
import { toDisplayDisposition, toDisplayPriority } from "@/lib/presentation"
import { buildObjectRoute, buildRoomRoute, buildSpaceRoute } from "@/lib/routes"

export default async function ReviewCenterPage() {
  const projects = await getRuntimeProjects()
  const items = await getRuntimeReviewQueue()
  const spaces = projects.flatMap((project) =>
    project.spaces.map((space) => ({
      projectName: project.name,
      readiness: getWorkflowReadiness(space),
      space,
    })),
  )
  const allSpacesExportReady = spaces.length > 0 && spaces.every((entry) => entry.readiness.exportReady)

  return (
    <main className="detail-shell" id="main-content">
      <header className="detail-header">
        <div>
          <p className="eyebrow">Review Center</p>
          <h1>Offene KI-Vorschlaege mit Raum- und Objektkontext.</h1>
          <p>Human-in-the-loop bleibt verbindlich: Disposition, Export und Publikation werden hier geprueft.</p>
        </div>
        <div className="detail-header__actions">
          <Link className="button button--secondary" href="/">
            Zur Uebersicht
          </Link>
          {allSpacesExportReady ? (
            <a
              className="button button--secondary"
              href="/api/export/all/csv?strict=true"
              download
            >
              Alle exportieren
            </a>
          ) : (
            <Link className="button button--secondary" href="/export-center">
              Export-Status ansehen
            </Link>
          )}
          {items[0] ? (
            <Link className="button button--primary" href={buildSpaceRoute(items[0].spaceId, "review")}>
              Direkt in den Review-Modus
            </Link>
          ) : null}
        </div>
      </header>

      <section className="section-grid">
        {spaces.map(({ projectName, readiness, space }) => (
          <article className="section-card" key={space.id}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">{projectName}</p>
                <h2>{space.name}</h2>
              </div>
              <span className={`pill ${readiness.pendingReviewCount === 0 ? "pill--active" : "pill--needs-review"}`}>
                {readiness.pendingReviewCount === 0 ? "Review abgeschlossen" : `${readiness.pendingReviewCount} offen`}
              </span>
            </div>
            <ul className="context-list">
              <li>{space.objects.length} Objekte insgesamt</li>
              <li>{readiness.reviewedCount + readiness.approvedCount} geprueft oder freigegeben</li>
              <li>{readiness.exportReady ? "Export bereit" : "Export blockiert"}</li>
              <li>{readiness.publishReady ? "Publikation bereit" : "Publikation blockiert"}</li>
            </ul>
            <div className="action-matrix">
              <Link className="button button--primary" href={buildSpaceRoute(space.id, "review")}>
                Space pruefen
              </Link>
              <Link className="button button--secondary" href={buildSpaceRoute(space.id, "listing")}>
                Listing ansehen
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section className="section-card review-center-shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Queue</p>
            <h2>{items.length} offene Entscheidungen</h2>
          </div>
          <p>
            Diese Liste verbindet das immersive Frontend mit dem operativen Kern: jedes Item fuehrt
            zur Buehne, zum Raum und zum Objektdossier.
          </p>
        </div>

        <div className="review-grid">
          {items.map((item) => (
            <article className="review-card" key={item.objectId}>
              <div className="review-card__header">
                <div>
                  <p className="eyebrow">{item.projectName}</p>
                  <h3>{item.objectTitle}</h3>
                </div>
                <span className={`pill pill--${item.priorityBand.toLowerCase()}`}>
                  {toDisplayPriority(item.priorityBand)}
                </span>
              </div>

              <p>
                {item.spaceName} · {item.roomName}
              </p>

              <dl className="review-card__meta">
                <div>
                  <dt>Status</dt>
                  <dd>{item.status}</dd>
                </div>
                <div>
                  <dt>Disposition</dt>
                  <dd>{toDisplayDisposition(item.disposition)}</dd>
                </div>
              </dl>

              <div className="review-card__actions">
                <Link className="button button--primary" href={buildObjectRoute(item.spaceId, item.objectId)}>
                  Objektdossier
                </Link>
                <Link className="button button--secondary" href={buildRoomRoute(item.spaceId, item.roomId)}>
                  Raumkontext
                </Link>
                <Link className="button button--secondary" href={buildSpaceRoute(item.spaceId, "review")}>
                  Immersive Pruefung
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
