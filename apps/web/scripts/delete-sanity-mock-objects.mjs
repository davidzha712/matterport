#!/usr/bin/env node
/**
 * Delete mock seed objects from Sanity.
 *
 * Usage:
 *   node apps/web/scripts/delete-sanity-mock-objects.mjs
 *
 * Requires SANITY_API_WRITE_TOKEN, NEXT_PUBLIC_SANITY_PROJECT_ID in .env.local
 */

import { createClient } from "@sanity/client"
import { config } from "dotenv"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, "../.env.local") })

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
const token = process.env.SANITY_API_WRITE_TOKEN

if (!projectId || !token) {
  console.error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_API_WRITE_TOKEN in .env.local")
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: "2024-01-01",
  useCdn: false,
})

// All IDs seeded by seed-sanity.mjs — delete everything that was mock data
const MOCK_IDS = [
  // Objects
  "objectRecord-walnut-cabinet",
  "objectRecord-mantel-clock",
  "objectRecord-atlas-desk",
  "objectRecord-archive-box",
  "objectRecord-brass-lantern",
  "objectRecord-visitor-map",
  // Rooms
  "roomRecord-living-room",
  "roomRecord-study",
  "roomRecord-intro-hall",
  // Spaces
  "spaceRecord-orchard-main-house",
  "spaceRecord-lantern-gallery",
  // Projects
  "spaceProject-estate-orchard",
  "spaceProject-museum-lantern",
  // AI Providers
  "aiProvider-openai",
  "aiProvider-qwen",
  "aiProvider-kimi",
  "aiProvider-minimax",
]

async function deleteMockData() {
  console.log(`Deleting ${MOCK_IDS.length} mock documents from ${projectId}/${dataset}...`)

  const transaction = client.transaction()
  for (const id of MOCK_IDS) {
    transaction.delete(id)
  }

  try {
    const result = await transaction.commit()
    console.log(`Done. Transaction ID: ${result.transactionId}`)
  } catch (err) {
    // Some IDs may not exist — that's fine, log and continue
    console.warn("Transaction warning (some docs may not have existed):", err.message)
  }

  // Verify deletion
  const remaining = await client.fetch(
    `*[_id in $ids]{ _id, _type }`,
    { ids: MOCK_IDS }
  )
  if (remaining.length === 0) {
    console.log("✓ All mock documents deleted successfully")
  } else {
    console.warn("⚠ Still present:", remaining.map((d) => d._id).join(", "))
  }
}

deleteMockData().catch((err) => {
  console.error("Delete failed:", err.message)
  process.exit(1)
})
