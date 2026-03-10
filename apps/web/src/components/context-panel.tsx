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
  panelConfig?: {
    leftPanel: boolean
    commandBar: boolean
    rightPanel: boolean
    objectWorkflowCard: boolean
    aiDetections: boolean
    workflowSidebar: boolean
  }
  providers: ProviderProfile[]
  selectedObject?: ObjectRecord
  selectedRoom?: RoomRecord
  showReviewCounts?: boolean
  space: SpaceRecord
}

export function ContextPanel({ panelConfig, providers, selectedObject, selectedRoom, showReviewCounts, space }: ContextPanelProps) {
  const { bridge, status, currentRoom: sdkRoom, sdkRooms } = useBridge()
  const t = useT()
  const [detectedObjects, setDetectedObjects] = useState<ObjectRecord[]>([])

  // Match SDK room to our data model for reactive room tracking
  const matchedRoom = sdkRoom
    ? space.rooms.find((r) =>
        (sdkRoom.name && r.name.toLowerCase() === sdkRoom.name.toLowerCase()) ||
        r.id === sdkRoom.id
      )
    : undefined

  // When SDK reports a room that doesn't exist in the data model, create a
  // lightweight RoomRecord from the SDK data so the UI reflects the real room.
  const sdkFallbackRoom: RoomRecord | undefined =
    !matchedRoom && sdkRoom?.name
      ? {
          id: sdkRoom.id,
          name: sdkRoom.name,
          objectIds: [],
          pendingReviewCount: 0,
          priorityBand: "Medium",
          recommendation: "",
          summary: "",
        }
      : undefined

  const focalRoom = selectedRoom ?? matchedRoom ?? sdkFallbackRoom ?? space.rooms[0]
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
      {panelConfig?.objectWorkflowCard === true ? (
        <ObjectWorkflowCard objectRecord={focalObject} objectRoute={objectRoute} spaceId={space.id} />
      ) : null}

      <section className="context-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t.objects.room}</p>
            <h2>{focalRoom.name}</h2>
          </div>
          {showReviewCounts === true ? (
            <span className="pill pill--active">{focalRoom.pendingReviewCount} {t.workflow.needsReview.toLowerCase()}</span>
          ) : null}
        </div>
        <p>{focalRoom.summary}</p>
        <ul className="context-list">
          <li>{t.common.objects}: {focalRoom.objectIds.length}</li>
          <li>{t.objects.disposition}: {focalRoom.priorityBand}</li>
          <li>{focalRoom.recommendation}</li>
        </ul>

        {/* Show SDK rooms when available, fall back to data model rooms */}
        {(sdkRooms.length > 0 || space.rooms.length > 1) ? (
          <div className="context-card__rooms">
            <p className="eyebrow">
              {t.common.rooms}
              {sdkRooms.length > 0 ? ` (${sdkRooms.length})` : ""}
            </p>
            <ul className="context-room-list">
              {sdkRooms.length > 0
                ? sdkRooms.filter((room) => room.name).map((room) => {
                    const dataRoom = space.rooms.find(
                      (r) => r.name.toLowerCase() === room.name.toLowerCase() || r.id === room.id
                    )
                    const isActive =
                      room.id === focalRoom.id ||
                      (sdkRoom && room.id === sdkRoom.id) ||
                      room.name.toLowerCase() === focalRoom.name.toLowerCase()
                    return (
                      <li key={room.id}>
                        <Link
                          className={`context-room-link${isActive ? " context-room-link--active" : ""}`}
                          href={buildRoomRoute(space.id, dataRoom?.id ?? room.id)}
                          onClick={(e) => handleRoomClick(e, room.id)}
                        >
                          <span>{room.name}</span>
                          <small>{dataRoom ? `${dataRoom.objectIds.length} ${t.common.objects.toLowerCase()}` : "SDK"}</small>
                        </Link>
                      </li>
                    )
                  })
                : space.rooms.map((room) => (
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
                  ))
              }
            </ul>
          </div>
        ) : null}
      </section>

      {/* AI-detected objects for current room */}
      {panelConfig?.aiDetections === true && detectedObjects.length > 0 ? (
        <section className="context-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t.contextPanel.aiDetections}</p>
              <h2>{detectedObjects.length} {t.contextPanel.objects}</h2>
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
              +{detectedObjects.length - 20} {t.contextPanel.moreObjects}
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
          <li>{t.contextPanel.dossierPlanned}</li>
          <li>{t.contextPanel.familyNotes}</li>
          <li>{t.contextPanel.aiVerifiable}</li>
        </ul>
      </section>
      {panelConfig?.workflowSidebar === true ? (
        <WorkflowSidebar providers={providers} spaceId={space.id} />
      ) : null}
      <Link className="primary-link" href="/settings/providers">
        {t.providers.headline}
      </Link>
    </aside>
  )
}
