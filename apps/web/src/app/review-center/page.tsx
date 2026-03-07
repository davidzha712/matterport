import Link from "next/link"
import { getRuntimeReviewQueue } from "@/lib/platform-service"
import { toDisplayDisposition, toDisplayPriority } from "@/lib/presentation"
import { buildObjectRoute, buildRoomRoute, buildSpaceRoute } from "@/lib/routes"

export default async function ReviewCenterPage() {
  const items = await getRuntimeReviewQueue()

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
          {items[0] ? (
            <Link className="button button--primary" href={buildSpaceRoute(items[0].spaceId, "review")}>
              Direkt in den Review-Modus
            </Link>
          ) : null}
        </div>
      </header>

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
