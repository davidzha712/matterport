import { NextResponse, type NextRequest } from "next/server"
import { readRoomStore, writeRoomStore, type StoredRoom } from "@/lib/room-store"

// GET /api/rooms?spaceId=X — return stored rooms for a space
export async function GET(request: NextRequest) {
  const spaceId = request.nextUrl.searchParams.get("spaceId")
  const store = readRoomStore()

  if (spaceId) {
    return NextResponse.json({ rooms: store.spaces[spaceId] ?? [] })
  }

  const allRooms = Object.entries(store.spaces).map(([id, rooms]) => ({ spaceId: id, rooms }))
  return NextResponse.json({ spaces: allRooms })
}

// POST /api/rooms — sync SDK rooms from a space into the CRM store
export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    spaceId: string
    rooms: Array<{
      id: string
      name: string
      bounds?: StoredRoom["bounds"]
    }>
  }

  if (!body.spaceId || !Array.isArray(body.rooms)) {
    return NextResponse.json({ detail: "Missing spaceId or rooms" }, { status: 400 })
  }

  const syncedAt = new Date().toISOString()
  const store = readRoomStore()

  store.spaces[body.spaceId] = body.rooms
    .filter((r) => r.id && r.name)
    .map((r) => ({
      id: r.id,
      name: r.name,
      bounds: r.bounds,
      syncedAt,
    }))

  writeRoomStore(store)

  return NextResponse.json({ synced: store.spaces[body.spaceId].length, syncedAt })
}
