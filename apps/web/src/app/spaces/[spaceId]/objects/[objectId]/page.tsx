import Link from "next/link"
import { notFound } from "next/navigation"
import { getObjectById, getSpaceById } from "@/lib/mock-data"
import { toDisplayDisposition, toDisplayObjectStatus } from "@/lib/presentation"
import { buildRoomRoute, buildSpaceRoute } from "@/lib/routes"

type ObjectDetailPageProps = {
  params: Promise<{
    objectId: string
    spaceId: string
  }>
}

export default async function ObjectDetailPage({ params }: ObjectDetailPageProps) {
  const { objectId, spaceId } = await params
  const space = getSpaceById(spaceId)
  const objectRecord = getObjectById(spaceId, objectId)

  if (!space || !objectRecord) {
    notFound()
  }

  return (
    <main className="detail-shell" id="main-content">
      <header className="detail-header">
        <div>
          <p className="eyebrow">Objektdossier</p>
          <h1>{objectRecord.title}</h1>
        </div>
        <div className="detail-header__actions">
          <Link className="button button--secondary" href={buildRoomRoute(spaceId, objectRecord.roomId)}>
            Raumkontext
          </Link>
          <Link className="button button--primary" href={buildSpaceRoute(spaceId)}>
            Zur Buehne
          </Link>
        </div>
      </header>

      <section className="detail-grid">
        <article className="detail-viewport">
          <div className="detail-viewport__frame">
            <p className="eyebrow">Detail Layer</p>
            <h2>IIIF und Deep Zoom folgen als naechster professioneller Layer.</h2>
            <p>
              Diese Ansicht reserviert bereits die Flaeche fuer hochaufgeloeste Objektbilder,
              Annotationen, Vergleichsansichten und spaetere regionenbasierte KI-Analysen.
            </p>
          </div>
        </article>

        <aside className="detail-sidebar">
          <section className="context-card context-card--hero">
            <p className="eyebrow">Metadaten</p>
            <dl className="detail-grid__meta">
              <div>
                <dt>Typ</dt>
                <dd>{objectRecord.type}</dd>
              </div>
              <div>
                <dt>Raum</dt>
                <dd>{objectRecord.roomName}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{toDisplayObjectStatus(objectRecord.status)}</dd>
              </div>
              <div>
                <dt>Disposition</dt>
                <dd>{toDisplayDisposition(objectRecord.disposition)}</dd>
              </div>
            </dl>
          </section>
          <section className="context-card">
            <p className="eyebrow">KI-Zusammenfassung</p>
            <p>{objectRecord.aiSummary}</p>
          </section>
          <section className="context-card">
            <p className="eyebrow">Audit-Hinweis</p>
            <ul className="context-list">
              <li>Automatische Erkennung bleibt bis zur Freigabe unverbindlich.</li>
              <li>Dispositionen werden spaeter als Zustandsmaschine modelliert.</li>
              <li>Export und Veroeffentlichung bleiben approval-gated.</li>
            </ul>
          </section>
        </aside>
      </section>
    </main>
  )
}
