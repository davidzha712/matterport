import Link from "next/link"
import { getProviderProfiles, type ObjectRecord, type RoomRecord, type SpaceRecord } from "@/lib/mock-data"
import { toDisplayDisposition, toDisplayObjectStatus, toToneToken } from "@/lib/presentation"
import { buildObjectRoute, buildRoomRoute } from "@/lib/routes"

type ContextPanelProps = {
  selectedObject?: ObjectRecord
  selectedRoom?: RoomRecord
  space: SpaceRecord
}

export function ContextPanel({ selectedObject, selectedRoom, space }: ContextPanelProps) {
  const focalObject = selectedObject ?? space.objects[0]
  const focalRoom = selectedRoom ?? space.rooms[0]
  const objectRoute = buildObjectRoute(space.id, focalObject.id)
  const roomRoute = buildRoomRoute(space.id, focalRoom.id)
  const activeProviders = getProviderProfiles().filter((provider) => provider.configured)

  return (
    <aside className="context-panel" aria-label="Raumkontext">
      <div className="context-panel__handle" aria-hidden="true" />
      <section className="context-card context-card--hero">
        <div className="context-card__tabs" aria-hidden="true">
          <span className="context-tab context-tab--active">Objektebene</span>
          <span className="context-tab">Raum</span>
          <span className="context-tab">Workflow</span>
          <span className="context-tab">Historie</span>
        </div>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Ausgewähltes Objekt</p>
            <h2>{focalObject.title}</h2>
          </div>
          <span className={`pill pill--${toToneToken(focalObject.status)}`}>
            {toDisplayObjectStatus(focalObject.status)}
          </span>
        </div>
        <p>{focalObject.aiSummary}</p>
        <dl className="context-meta-grid">
          <div>
            <dt>Typ</dt>
            <dd>{focalObject.type}</dd>
          </div>
          <div>
            <dt>Raum</dt>
            <dd>{focalObject.roomName}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{toDisplayDisposition(focalObject.disposition)}</dd>
          </div>
          <div>
            <dt>KI-Status</dt>
            <dd>Nur Empfehlung</dd>
          </div>
        </dl>
        <div className="knowledge-strip" aria-label="Objektschichten">
          <span>Metadaten aktiv</span>
          <span>Review-first</span>
          <span>Open Layer faehig</span>
        </div>
        <div className="asset-strip" aria-label="Dossier-Vorschau">
          <div className="asset-strip__card">Frame capture</div>
          <div className="asset-strip__card">Document scan</div>
          <div className="asset-strip__card">Voice note</div>
        </div>
        <div className="action-matrix" aria-label="Disposition actions">
          <button className="action-matrix__button action-matrix__button--keep" type="button">
            Behalten
          </button>
          <button className="action-matrix__button action-matrix__button--sell" type="button">
            Verkaufen
          </button>
          <button className="action-matrix__button action-matrix__button--donate" type="button">
            Spenden
          </button>
          <button className="action-matrix__button action-matrix__button--archive" type="button">
            Archivieren
          </button>
        </div>
        <Link className="primary-link" href={objectRoute}>
          Objektdossier öffnen
        </Link>
      </section>

      <section className="context-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Aktueller Raum</p>
            <h2>{focalRoom.name}</h2>
          </div>
          <span className="pill pill--active">{focalRoom.pendingReviewCount} offen</span>
        </div>
        <p>{focalRoom.summary}</p>
        <ul className="context-list">
          <li>Objekte im Raum: {focalRoom.objectIds.length}</li>
          <li>Priorität: {focalRoom.priorityBand}</li>
          <li>Empfehlung: {focalRoom.recommendation}</li>
        </ul>
        <Link className="primary-link" href={roomRoute}>
          Raumansicht öffnen
        </Link>
      </section>

      <section className="context-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Sammlungspfad</p>
            <h2>Assets und Provenienz</h2>
          </div>
        </div>
        <ul className="context-list">
          <li>Hochaufgeloestes Dossier und IIIF-Deep-Zoom sind als naechster Layer geplant.</li>
          <li>Familiennotizen und Kuratorhinweise bekommen eigene Slots.</li>
          <li>Jede KI-Ausgabe bleibt pruefbar und nachvollziehbar.</li>
        </ul>
      </section>

      <section className="context-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Workflow-Status</p>
            <h2>Pruefregeln</h2>
          </div>
        </div>
        <ul className="context-list">
          <li>
            {activeProviders.length > 0
              ? `Aktiv geroutet: ${activeProviders.map((provider) => provider.label).join(", ")}.`
              : "Noch kein Provider aktiv verbunden."}
          </li>
          <li>KI-Ausgaben bleiben bis zur menschlichen Prüfung unverbindlich.</li>
          <li>Verkauf, Spende, Archiv und Export brauchen Freigaben.</li>
          <li>Provider-Keys liegen nur im Backend und sind projektgebunden.</li>
        </ul>
        <Link className="primary-link" href="/settings/providers">
          Routing-Status oeffnen
        </Link>
      </section>
    </aside>
  )
}
