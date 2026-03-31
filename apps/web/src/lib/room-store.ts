import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"

export type StoredRoom = {
  id: string
  name: string
  bounds?: {
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
  }
  syncedAt: string
}

type RoomStore = {
  spaces: Record<string, StoredRoom[]>
  updatedAt: string
}

const DATA_DIR = join(process.cwd(), ".data")
const STORE_PATH = join(DATA_DIR, "rooms.json")

function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
}

export function readRoomStore(): RoomStore {
  ensureDir()
  if (!existsSync(STORE_PATH)) {
    return { spaces: {}, updatedAt: new Date().toISOString() }
  }
  try {
    const raw = readFileSync(STORE_PATH, "utf-8")
    return JSON.parse(raw) as RoomStore
  } catch {
    return { spaces: {}, updatedAt: new Date().toISOString() }
  }
}

export function writeRoomStore(store: RoomStore): void {
  ensureDir()
  writeFileSync(
    STORE_PATH,
    JSON.stringify({ ...store, updatedAt: new Date().toISOString() }, null, 2),
    "utf-8"
  )
}
