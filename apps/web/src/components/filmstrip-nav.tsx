"use client"

import Link from "next/link"
import type { RoomRecord } from "@/lib/platform-types"
import { useBridge } from "@/lib/bridge-context"
import { useT } from "@/lib/i18n"
import { buildRoomRoute } from "@/lib/routes"

type FilmstripNavProps = {
  rooms: RoomRecord[]
  currentRoom?: RoomRecord
  spaceId: string
}

export function FilmstripNav({ rooms, currentRoom, spaceId }: FilmstripNavProps) {
  const { bridge, status } = useBridge()
  const t = useT()

  return (
    <div className="filmstrip-nav" role="navigation" aria-label={t.common.rooms}>
      {rooms.map((room) => {
        const className = `filmstrip-nav__item${room.id === currentRoom?.id ? " filmstrip-nav__item--active" : ""}`
        const reviewLabel =
          room.pendingReviewCount === 0
            ? t.reviewMode.reviewed
            : `${room.pendingReviewCount} ${t.workflow.needsReview.toLowerCase()}`

        const content = (
          <>
            <span className="filmstrip-nav__name">{room.name}</span>
            <span className="filmstrip-nav__meta">
              <span className="filmstrip-nav__count">
                {room.objectIds.length} {t.common.objects.toLowerCase()}
              </span>
              <span
                className={`filmstrip-nav__status${room.pendingReviewCount === 0 ? " filmstrip-nav__status--reviewed" : ""}`}
              >
                {reviewLabel}
              </span>
            </span>
          </>
        )

        if (status === "sdk-connected") {
          return (
            <button
              key={room.id}
              className={className}
              onClick={() => {
                void bridge.navigateToRoom(room.id)
              }}
              type="button"
            >
              {content}
            </button>
          )
        }

        return (
          <Link key={room.id} className={className} href={buildRoomRoute(spaceId, room.id)}>
            {content}
          </Link>
        )
      })}
    </div>
  )
}
