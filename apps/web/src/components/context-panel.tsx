import Link from "next/link"
import type { ObjectRecord, ProviderProfile, RoomRecord, SpaceRecord } from "@/lib/mock-data"
import { ObjectWorkflowCard } from "@/components/object-workflow-card"
import { WorkflowSidebar } from "@/components/workflow-sidebar"
import { buildObjectRoute, buildRoomRoute } from "@/lib/routes"

type ContextPanelProps = {
  providers: ProviderProfile[]
  selectedObject?: ObjectRecord
  selectedRoom?: RoomRecord
  space: SpaceRecord
}

export function ContextPanel({ providers, selectedObject, selectedRoom, space }: ContextPanelProps) {
  const focalObject = selectedObject ?? space.objects[0]
  const focalRoom = selectedRoom ?? space.rooms[0]
  const objectRoute = buildObjectRoute(space.id, focalObject.id)
  const roomRoute = buildRoomRoute(space.id, focalRoom.id)

  return (
    <aside className="context-panel" aria-label="Raumkontext">
      <div className="context-panel__handle" aria-hidden="true" />
      <ObjectWorkflowCard objectRecord={focalObject} objectRoute={objectRoute} spaceId={space.id} />

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
      <WorkflowSidebar providers={providers} spaceId={space.id} />
      <Link className="primary-link" href="/settings/providers">
        Routing-Status oeffnen
      </Link>
    </aside>
  )
}
