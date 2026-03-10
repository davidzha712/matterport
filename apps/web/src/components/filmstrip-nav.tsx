"use client"

import type { RoomRecord } from "@/lib/platform-types"
import { useBridge } from "@/lib/bridge-context"

type FilmstripNavProps = {
  rooms: RoomRecord[]
  currentRoom?: RoomRecord
  spaceId: string
}

export function FilmstripNav({ rooms, currentRoom }: FilmstripNavProps) {
  const { bridge, status } = useBridge()

  return (
    <div className="filmstrip-nav" role="navigation" aria-label="Room gallery">
      {rooms.map((room) => (
        <button
          key={room.id}
          className={`filmstrip-nav__item${room.id === currentRoom?.id ? " filmstrip-nav__item--active" : ""}`}
          onClick={() => {
            if (status === "sdk-connected") {
              void bridge.navigateToRoom(room.id)
            }
          }}
          type="button"
        >
          <span className="filmstrip-nav__name">{room.name}</span>
          <span className="filmstrip-nav__count">{room.objectIds.length} obj</span>
        </button>
      ))}
    </div>
  )
}
