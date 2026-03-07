import Link from "next/link"
import { notFound } from "next/navigation"
import { getRoomById, getSpaceById } from "@/lib/mock-data"
import { buildSpaceRoute } from "@/lib/routes"

type RoomDetailPageProps = {
  params: Promise<{
    roomId: string
    spaceId: string
  }>
}

export default async function RoomDetailPage({ params }: RoomDetailPageProps) {
  const { roomId, spaceId } = await params
  const space = getSpaceById(spaceId)
  const room = getRoomById(spaceId, roomId)

  if (!space || !room) {
    notFound()
  }

  return (
    <main className="detail-shell" id="main-content">
      <header className="detail-header">
        <div>
          <p className="eyebrow">Raumdossier</p>
          <h1>{room.name}</h1>
        </div>
        <div className="detail-header__actions">
          <Link className="button button--primary" href={buildSpaceRoute(spaceId)}>
            Zur Buehne
          </Link>
        </div>
      </header>

      <section className="detail-grid">
        <article className="detail-viewport">
          <div className="detail-viewport__frame">
            <p className="eyebrow">Kuratorischer Kontext</p>
            <h2>{room.summary}</h2>
            <p>
              Diese Ansicht buendelt spaeter Heatmaps, priorisierte Objektcluster, Raumstatistik und
              narrative Layer fuer Fuehrung und Inventararbeit.
            </p>
          </div>
        </article>

        <aside className="detail-sidebar">
          <section className="context-card context-card--hero">
            <p className="eyebrow">Raumwerte</p>
            <dl className="detail-grid__meta">
              <div>
                <dt>Objekte</dt>
                <dd>{room.objectIds.length}</dd>
              </div>
              <div>
                <dt>Review offen</dt>
                <dd>{room.pendingReviewCount}</dd>
              </div>
              <div>
                <dt>Prioritaet</dt>
                <dd>{room.priorityBand}</dd>
              </div>
              <div>
                <dt>Empfehlung</dt>
                <dd>{room.recommendation}</dd>
              </div>
            </dl>
          </section>
          <section className="context-card">
            <p className="eyebrow">Naechster Schritt</p>
            <ul className="context-list">
              <li>Objektgruppen praeziser im Raum verankern.</li>
              <li>Kuratorische und operative Sichten trennen.</li>
              <li>Exportfaehige Raumzusammenfassungen generieren.</li>
            </ul>
          </section>
        </aside>
      </section>
    </main>
  )
}
