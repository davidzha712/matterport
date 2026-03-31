import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import type { ObjectRecord } from "./platform-types"

type ObjectStore = {
  objects: ObjectRecord[]
  updatedAt: string
}

const DATA_DIR = join(process.cwd(), ".data")
const STORE_PATH = join(DATA_DIR, "objects.json")

function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
}

export function readObjectStore(): ObjectStore {
  ensureDir()
  if (!existsSync(STORE_PATH)) {
    return { objects: [], updatedAt: new Date().toISOString() }
  }
  try {
    const raw = readFileSync(STORE_PATH, "utf-8")
    return JSON.parse(raw) as ObjectStore
  } catch {
    return { objects: [], updatedAt: new Date().toISOString() }
  }
}

export function writeObjectStore(store: ObjectStore): void {
  ensureDir()
  const data: ObjectStore = {
    ...store,
    updatedAt: new Date().toISOString(),
  }
  writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8")
}

export function mergeObjectsForSpace(
  baseObjects: ObjectRecord[],
  storedObjects: ObjectRecord[],
  spaceId: string,
): ObjectRecord[] {
  const merged = new Map(
    baseObjects.map((objectRecord) => [
      objectRecord.id,
      { ...objectRecord, spaceId: objectRecord.spaceId ?? spaceId },
    ]),
  )

  for (const storedObject of storedObjects) {
    if (storedObject.spaceId !== spaceId) continue

    const existing = merged.get(storedObject.id)
    merged.set(
      storedObject.id,
      existing
        ? { ...existing, ...storedObject, spaceId }
        : { ...storedObject, spaceId },
    )
  }

  return [...merged.values()]
}

export function mergeObjectCollections(
  baseObjects: ObjectRecord[],
  persistedObjects: ObjectRecord[],
): ObjectRecord[] {
  const merged = new Map<string, ObjectRecord>()

  for (const objectRecord of baseObjects) {
    merged.set(objectRecord.id, objectRecord)
  }

  for (const persistedObject of persistedObjects) {
    const existing = merged.get(persistedObject.id)
    merged.set(
      persistedObject.id,
      existing ? { ...existing, ...persistedObject } : persistedObject,
    )
  }

  return Array.from(merged.values())
}
