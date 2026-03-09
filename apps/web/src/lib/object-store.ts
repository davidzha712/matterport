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
