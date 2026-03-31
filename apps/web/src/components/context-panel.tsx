"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { ObjectRecord, ProviderProfile, RoomRecord, SpaceRecord } from "@/lib/platform-types"
import { ObjectWorkflowCard } from "@/components/object-workflow-card"
import { WorkflowSidebar } from "@/components/workflow-sidebar"
import { useBridge } from "@/lib/bridge-context"
import { useT } from "@/lib/i18n"
import { getWorkflowReadiness } from "@/lib/workflow-readiness"
import { buildObjectRoute, buildRoomRoute } from "@/lib/routes"

type ContextPanelProps = {
  apiObjects?: ObjectRecord[]
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

export function ContextPanel({ apiObjects, panelConfig, providers, selectedObject, selectedRoom, showReviewCounts, space }: ContextPanelProps) {
  const { bridge, status, currentRoom: sdkRoom, sdkRooms } = useBridge()
  const t = useT()
  const [fetchedDetectedObjects, setFetchedDetectedObjects] = useState<ObjectRecord[]>([])
  const [selectedDetectedObjectId, setSelectedDetectedObjectId] = useState<string | null>(null)

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

  const focalRoom = matchedRoom ?? selectedRoom ?? sdkFallbackRoom ?? space.rooms[0] ?? {
    id: "",
    name: space.name,
    objectIds: [],
    pendingReviewCount: 0,
    priorityBand: "Medium" as const,
    recommendation: "",
    summary: "",
  }
  const roomScopedApiObjects = useMemo(() => {
    if (apiObjects === undefined) {
      return undefined
    }

    return apiObjects.filter(
      (objectRecord) =>
        (focalRoom.id && objectRecord.roomId === focalRoom.id) ||
        objectRecord.roomName?.toLowerCase() === focalRoom.name.toLowerCase()
    )
  }, [apiObjects, focalRoom.id, focalRoom.name])

  const defaultObject =
    selectedObject ??
    roomScopedApiObjects?.[0] ??
    space.objects.find((objectRecord) => objectRecord.roomId === focalRoom.id)

  const loadDetectedObjects = useCallback(async () => {
    try {
      const params = new URLSearchParams({ spaceId: space.id })
      if (focalRoom.id) params.set("roomId", focalRoom.id)
      const res = await fetch(`/api/objects?${params.toString()}`)
      if (res.ok) {
        const data = (await res.json()) as { objects: ObjectRecord[] }
        return data.objects
      }
    } catch {
      // Best-effort
    }

    return null
  }, [focalRoom.id, space.id])

  useEffect(() => {
    if (roomScopedApiObjects !== undefined) {
      return
    }

    let ignore = false

    async function syncDetectedObjects() {
      const nextObjects = await loadDetectedObjects()
      if (!ignore && nextObjects) {
        setFetchedDetectedObjects(nextObjects)
      }
    }

    void syncDetectedObjects()

    return () => {
      ignore = true
    }
  }, [loadDetectedObjects, roomScopedApiObjects])

  // Re-fetch when objects are updated (from stage-controls batch save)
  useEffect(() => {
    if (roomScopedApiObjects !== undefined) {
      return
    }

    let ignore = false

    function onUpdated() {
      void loadDetectedObjects().then((nextObjects) => {
        if (!ignore && nextObjects) {
          setFetchedDetectedObjects(nextObjects)
        }
      })
    }

    window.addEventListener("objects-updated", onUpdated)
    return () => {
      ignore = true
      window.removeEventListener("objects-updated", onUpdated)
    }
  }, [loadDetectedObjects, roomScopedApiObjects])

  const detectedObjects = roomScopedApiObjects ?? fetchedDetectedObjects
  const selectedDetectedObject = useMemo(
    () => detectedObjects.find((objectRecord) => objectRecord.id === selectedDetectedObjectId) ?? null,
    [detectedObjects, selectedDetectedObjectId]
  )
  const focalObject = selectedDetectedObject ?? defaultObject
  const objectRoute = focalObject ? buildObjectRoute(space.id, focalObject.id) : ""
  const roomObjectCount = detectedObjects.length > 0 ? detectedObjects.length : focalRoom.objectIds.length
  const workflowReadiness = useMemo(
    () => getWorkflowReadiness(space, apiObjects && apiObjects.length > 0 ? apiObjects : undefined),
    [apiObjects, space],
  )

  const handleRoomClick = useCallback(
    (e: React.MouseEvent, roomId: string) => {
      if (status === "sdk-connected") {
        e.preventDefault()
        void bridge.navigateToRoom(roomId)
      }
    },
    [bridge, status]
  )

  const handleDetectedObjectClick = useCallback(
    (obj: ObjectRecord) => {
      setSelectedDetectedObjectId((prev) => (prev === obj.id ? null : obj.id))
    },
    []
  )

  useEffect(() => {
    function onTagClicked(event: Event) {
      const annotationId = (event as CustomEvent<{ annotationId?: string }>).detail.annotationId
      if (!annotationId) return

      const annotation = bridge.getAnnotations().find((candidate) => candidate.id === annotationId)
      if (!annotation) return

      const nextObject =
        (annotation.objectId
          ? detectedObjects.find((objectRecord) => objectRecord.id === annotation.objectId)
          : undefined) ??
        (annotation.tagId
          ? detectedObjects.find((objectRecord) => objectRecord.tagId === annotation.tagId)
          : undefined) ??
        detectedObjects.find(
          (objectRecord) => objectRecord.title.trim().toLowerCase() === annotation.label.trim().toLowerCase()
        )

      if (nextObject) {
        setSelectedDetectedObjectId(nextObject.id)
      }
    }

    window.addEventListener("annotation-tag-clicked", onTagClicked)
    return () => window.removeEventListener("annotation-tag-clicked", onTagClicked)
  }, [bridge, detectedObjects])

  return (
    <aside className="context-panel" aria-label={t.stage.roomContext}>
      <div className="context-panel__handle" aria-hidden="true" />
      {panelConfig?.objectWorkflowCard === true && focalObject ? (
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
          <li>{t.common.objects}: {roomObjectCount}</li>
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
                          <small>
                            {dataRoom
                              ? dataRoom.pendingReviewCount === 0
                                ? `${dataRoom.objectIds.length} ${t.common.objects.toLowerCase()} · ${t.contextPanel.roomReady}`
                                : `${dataRoom.pendingReviewCount} ${t.contextPanel.roomPending}`
                              : "SDK"}
                          </small>
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
                        <small>
                          {room.pendingReviewCount === 0
                            ? `${room.objectIds.length} ${t.common.objects.toLowerCase()} · ${t.contextPanel.roomReady}`
                            : `${room.pendingReviewCount} ${t.contextPanel.roomPending}`}
                        </small>
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
            {detectedObjects.slice(0, 20).map((obj) => {
              const isSelected = selectedDetectedObject?.id === obj.id
              return (
                <li
                  key={obj.id}
                  className={`context-detected-item context-detected-item--clickable${isSelected ? " context-detected-item--selected" : ""}`}
                  onClick={() => handleDetectedObjectClick(obj)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      handleDetectedObjectClick(obj)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                >
                  <div className="context-detected-item__header">
                    <strong>{obj.title}</strong>
                    {obj.confidence != null ? (
                      <span className="context-detected-item__confidence">
                        {Math.round(obj.confidence * 100)}%
                      </span>
                    ) : null}
                  </div>
                  {obj.type ? <span className="context-detected-item__tag">{obj.type}{obj.category ? ` · ${obj.category}` : ""}</span> : obj.category ? <span className="context-detected-item__tag">{obj.category}</span> : null}
                  {obj.description ? (
                    <p className="context-detected-item__desc">{obj.description}</p>
                  ) : null}
                  <div className="context-detected-item__meta">
                    {obj.disposition ? <span>{obj.disposition}</span> : null}
                    {obj.condition && obj.condition !== "Unknown" ? <span>{obj.condition}</span> : null}
                    {obj.material ? <span>{obj.material}</span> : null}
                    <span>{obj.status}</span>
                  </div>
                </li>
              )
            })}
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
        <WorkflowSidebar providers={providers} readiness={workflowReadiness} spaceId={space.id} />
      ) : null}
      <Link className="primary-link" href="/settings/providers">
        {t.providers.headline}
      </Link>
    </aside>
  )
}
