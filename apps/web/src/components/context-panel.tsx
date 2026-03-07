import Link from "next/link"
import type { ObjectRecord, RoomRecord, SpaceRecord } from "@/lib/mock-data"
import { toToneToken } from "@/lib/presentation"
import { buildObjectRoute, buildRoomRoute } from "@/lib/routes"

type ContextPanelProps = {
  selectedObject?: ObjectRecord
  selectedRoom?: RoomRecord
  space: SpaceRecord
}

export function ContextPanel({ selectedObject, selectedRoom, space }: ContextPanelProps) {
  const focalObject = selectedObject ?? space.objects[0]
  const focalRoom = selectedRoom ?? space.rooms[0]

  return (
    <aside className="context-panel" aria-label="Space context">
      <section className="context-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Current room</p>
            <h2>{focalRoom.name}</h2>
          </div>
          <span className="pill pill--active">{focalRoom.pendingReviewCount} pending</span>
        </div>
        <p>{focalRoom.summary}</p>
        <ul className="context-list">
          <li>Objects in room: {focalRoom.objectIds.length}</li>
          <li>Priority: {focalRoom.priorityBand}</li>
          <li>Suggested action: {focalRoom.recommendation}</li>
        </ul>
        <Link className="primary-link" href={buildRoomRoute(space.id, focalRoom.id)}>
          Open room dashboard
        </Link>
      </section>

      <section className="context-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Selected object</p>
            <h2>{focalObject.title}</h2>
          </div>
          <span className={`pill pill--${toToneToken(focalObject.status)}`}>{focalObject.status}</span>
        </div>
        <p>{focalObject.aiSummary}</p>
        <ul className="context-list">
          <li>Type: {focalObject.type}</li>
          <li>Room: {focalObject.roomName}</li>
          <li>Disposition: {focalObject.disposition}</li>
        </ul>
        <Link className="primary-link" href={buildObjectRoute(space.id, focalObject.id)}>
          Open object detail
        </Link>
      </section>

      <section className="context-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Workflow posture</p>
            <h2>Review policy</h2>
          </div>
        </div>
        <ul className="context-list">
          <li>AI outputs are advisory until human review.</li>
          <li>Sell, donate, archive, and export require approval gates.</li>
          <li>Provider keys are backend-only and tenant-scoped.</li>
        </ul>
      </section>
    </aside>
  )
}
