import { NextResponse, type NextRequest } from "next/server"
import { readObjectStore, writeObjectStore } from "@/lib/object-store"
import type { ObjectRecord } from "@/lib/platform-types"

// GET /api/objects?spaceId=x&roomId=y
export async function GET(request: NextRequest) {
  const spaceId = request.nextUrl.searchParams.get("spaceId")
  const roomId = request.nextUrl.searchParams.get("roomId")
  const store = readObjectStore()

  let results = store.objects
  if (spaceId) {
    results = results.filter((o) => o.spaceId === spaceId)
  }
  if (roomId) {
    results = results.filter((o) => o.roomId === roomId)
  }

  return NextResponse.json({ objects: results })
}

// POST /api/objects  — create one or batch
export async function POST(request: NextRequest) {
  const body = (await request.json()) as { objects?: Partial<ObjectRecord>[]; object?: Partial<ObjectRecord> }
  const store = readObjectStore()
  const now = new Date().toISOString()
  const created: ObjectRecord[] = []

  const items = body.objects ?? (body.object ? [body.object] : [])

  for (const item of items) {
    if (!item.title) continue

    const obj: ObjectRecord = {
      id: item.id ?? `obj_${crypto.randomUUID().slice(0, 8)}`,
      title: item.title,
      type: item.type ?? item.category ?? "Unknown",
      status: item.status ?? "Needs Review",
      disposition: item.disposition ?? "Keep",
      aiSummary: item.aiSummary ?? item.description ?? "",
      roomId: item.roomId ?? "",
      roomName: item.roomName ?? "",
      spaceId: item.spaceId,
      category: item.category,
      condition: item.condition,
      confidence: item.confidence,
      material: item.material,
      dimensions: item.dimensions,
      era: item.era,
      estimatedValue: item.estimatedValue,
      provenance: item.provenance,
      notes: item.notes,
      insuranceNotes: item.insuranceNotes,
      description: item.description,
      position: item.position,
      tagId: item.tagId,
      createdBy: item.createdBy ?? "ai",
      createdAt: now,
      updatedAt: now,
    }

    store.objects.push(obj)
    created.push(obj)
  }

  writeObjectStore(store)
  return NextResponse.json({ created, count: created.length }, { status: 201 })
}

// PATCH /api/objects  — update by id
export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as { id: string } & Partial<ObjectRecord>
  if (!body.id) {
    return NextResponse.json({ detail: "Missing id" }, { status: 400 })
  }

  const store = readObjectStore()
  const idx = store.objects.findIndex((o) => o.id === body.id)
  if (idx === -1) {
    return NextResponse.json({ detail: "Object not found" }, { status: 404 })
  }

  const { id: _id, ...updates } = body
  store.objects[idx] = {
    ...store.objects[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  writeObjectStore(store)
  return NextResponse.json({ object: store.objects[idx] })
}

// DELETE /api/objects?id=x
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")
  if (!id) {
    return NextResponse.json({ detail: "Missing id" }, { status: 400 })
  }

  const store = readObjectStore()
  const before = store.objects.length
  store.objects = store.objects.filter((o) => o.id !== id)

  if (store.objects.length === before) {
    return NextResponse.json({ detail: "Object not found" }, { status: 404 })
  }

  writeObjectStore(store)
  return NextResponse.json({ deleted: true })
}
