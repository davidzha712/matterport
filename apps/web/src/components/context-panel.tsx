"use client"

import Link from "next/link"
import { useCallback } from "react"
import type { ObjectRecord, ProviderProfile, RoomRecord, SpaceRecord } from "@/lib/mock-data"
import { ObjectWorkflowCard } from "@/components/object-workflow-card"
import { WorkflowSidebar } from "@/components/workflow-sidebar"
import { useBridge } from "@/lib/bridge-context"
import { useT } from "@/lib/i18n"
import { buildObjectRoute, buildRoomRoute } from "@/lib/routes"

type ContextPanelProps = {
  providers: ProviderProfile[]
  selectedObject?: ObjectRecord
  selectedRoom?: RoomRecord
  space: SpaceRecord
}

export function ContextPanel({ providers, selectedObject, selectedRoom, space }: ContextPanelProps) {
  const { bridge, status } = useBridge()
  const t = useT()
  const focalObject = selectedObject ?? space.objects[0]
  const focalRoom = selectedRoom ?? space.rooms[0]
  const objectRoute = buildObjectRoute(space.id, focalObject.id)

  const handleRoomClick = useCallback(
    (e: React.MouseEvent, roomId: string) => {
      if (status === "sdk-connected") {
        e.preventDefault()
        void bridge.navigateToRoom(roomId)
      }
    },
    [bridge, status]
  )

  return (
    <aside className="context-panel" aria-label={t.stage.roomContext}>
      <div className="context-panel__handle" aria-hidden="true" />
      <ObjectWorkflowCard objectRecord={focalObject} objectRoute={objectRoute} spaceId={space.id} />

      <section className="context-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t.objects.room}</p>
            <h2>{focalRoom.name}</h2>
          </div>
          <span className="pill pill--active">{focalRoom.pendingReviewCount} {t.workflow.needsReview.toLowerCase()}</span>
        </div>
        <p>{focalRoom.summary}</p>
        <ul className="context-list">
          <li>{t.common.objects}: {focalRoom.objectIds.length}</li>
          <li>{t.objects.disposition}: {focalRoom.priorityBand}</li>
          <li>{focalRoom.recommendation}</li>
        </ul>

        {space.rooms.length > 1 ? (
          <div className="context-card__rooms">
            <p className="eyebrow">{t.common.rooms}</p>
            <ul className="context-room-list">
              {space.rooms.map((room) => (
                <li key={room.id}>
                  <Link
                    className={`context-room-link${room.id === focalRoom.id ? " context-room-link--active" : ""}`}
                    href={buildRoomRoute(space.id, room.id)}
                    onClick={(e) => handleRoomClick(e, room.id)}
                  >
                    <span>{room.name}</span>
                    <small>{room.objectIds.length} {t.common.objects.toLowerCase()}</small>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="context-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t.portfolio.eyebrow}</p>
            <h2>{t.objects.metadata}</h2>
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
        {t.providers.headline}
      </Link>
    </aside>
  )
}
