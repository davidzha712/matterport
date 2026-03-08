import { cp, mkdir } from "node:fs/promises"
import { createRequire } from "node:module"
import path from "node:path"

const require = createRequire(import.meta.url)
const source = require.resolve("next/dist/server/use-cache/cache-life.d.ts")
const targetDir = path.resolve(".next/types")
const target = path.join(targetDir, "cache-life.d.ts")

// Next 16 currently generates validator/types without materializing this file in .next/types.
await mkdir(targetDir, { recursive: true })
await cp(source, target)
