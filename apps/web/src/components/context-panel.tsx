"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import type { ObjectRecord, ProviderProfile, RoomRecord, SpaceRecord } from "@/lib/platform-types"
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
  const { bridge, status, currentRoom: sdkRoom } = useBridge()
  const t = useT()
  const [detectedObjects, setDetectedObjects] = useState<ObjectRecord[]>([])

  // Match SDK room to our data model for reactive room tracking
  const matchedRoom = sdkRoom
    ? space.rooms.find((r) =>
        (sdkRoom.name && r.name.toLowerCase() === sdkRoom.name.toLowerCase()) ||
        r.id === sdkRoom.id
      )
    : undefined
  const focalRoom = selectedRoom ?? matchedRoom ?? space.rooms[0]
  const focalObject = selectedObject ?? space.objects.find((o) => o.roomId === focalRoom.id) ?? space.objects[0]
  const objectRoute = buildObjectRoute(space.id, focalObject.id)

  // Fetch persisted AI-detected objects for the current room
  const fetchDetectedObjects = useCallback(async () => {
    try {
      const params = new URLSearchParams({ spaceId: space.id })
      if (focalRoom.id) params.set("roomId", focalRoom.id)
      const res = await fetch(`/api/objects?${params.toString()}`)
      if (res.ok) {
        const data = (await res.json()) as { objects: ObjectRecord[] }
        setDetectedObjects(data.objects)
      }
    } catch {
      // Best-effort
    }
  }, [space.id, focalRoom.id])

  useEffect(() => {
    void fetchDetectedObjects()
  }, [fetchDetectedObjects])

  // Re-fetch when objects are updated (from stage-controls batch save)
  useEffect(() => {
    function onUpdated() {
      void fetchDetectedObjects()
    }
    window.addEventListener("objects-updated", onUpdated)
    return () => window.removeEventListener("objects-updated", onUpdated)
  }, [fetchDetectedObjects])

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

      {/* AI-detected objects for current room */}
      {detectedObjects.length > 0 ? (
        <section className="context-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">AI Detections</p>
              <h2>{detectedObjects.length} Objects</h2>
            </div>
          </div>
          <ul className="context-list context-list--dense">
            {detectedObjects.slice(0, 20).map((obj) => (
              <li key={obj.id} className="context-detected-item">
                <div className="context-detected-item__header">
                  <strong>{obj.title}</strong>
                  {obj.confidence != null ? (
                    <span className="context-detected-item__confidence">
                      {Math.round(obj.confidence * 100)}%
                    </span>
                  ) : null}
                </div>
                {obj.category ? <span className="context-detected-item__tag">{obj.category}</span> : null}
                {obj.description ? (
                  <p className="context-detected-item__desc">{obj.description}</p>
                ) : null}
                <div className="context-detected-item__meta">
                  {obj.condition && obj.condition !== "Unknown" ? <span>{obj.condition}</span> : null}
                  {obj.material ? <span>{obj.material}</span> : null}
                  <span>{obj.status}</span>
                </div>
              </li>
            ))}
          </ul>
          {detectedObjects.length > 20 ? (
            <p className="text-xs text-muted-foreground mt-2">
              +{detectedObjects.length - 20} more objects
            </p>
          ) : null}
        </section>
      ) : null}

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
