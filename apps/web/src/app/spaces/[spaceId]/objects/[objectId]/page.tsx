import Link from "next/link"
import { notFound } from "next/navigation"
import { IIIFViewer } from "@/components/iiif-viewer"
import { ObjectMetadataEditor } from "@/components/object-metadata-editor"
import { getRuntimeObject } from "@/lib/platform-service"
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
  const { objectRecord, space } = await getRuntimeObject(spaceId, objectId)

  if (!space || !objectRecord) {
    notFound()
  }

  const relatedObjects = space.objects
    .filter((candidate) => candidate.roomId === objectRecord.roomId && candidate.id !== objectRecord.id)
    .slice(0, 3)

  return (
    <main className="detail-shell" id="main-content">
      <header className="detail-header">
        <div>
          <p className="eyebrow">Objektdossier</p>
          <h1>{objectRecord.title}</h1>
          <p>{space.projectName} · {objectRecord.roomName}</p>
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
            <IIIFViewer title={objectRecord.title} />
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

          <ObjectMetadataEditor objectRecord={objectRecord} spaceId={spaceId} />

          {relatedObjects.length ? (
            <section className="context-card">
              <p className="eyebrow">Verwandte Objekte im Raum</p>
              <ul className="detail-link-list">
                {relatedObjects.map((relatedObject) => (
                  <li key={relatedObject.id}>
                    <Link href={`${buildSpaceRoute(spaceId)}/objects/${relatedObject.id}`}>
                      <strong>{relatedObject.title}</strong>
                      <span>{relatedObject.type}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
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
