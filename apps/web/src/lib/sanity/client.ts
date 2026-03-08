import "server-only"

import { createClient, type SanityClient } from "next-sanity"

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? ""
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
export const apiVersion = process.env.SANITY_API_VERSION || "2024-01-01"
const readToken = process.env.SANITY_API_READ_TOKEN

const validProjectId = /^[a-z0-9-]+$/.test(projectId) ? projectId : ""

export function isSanityConfigured() {
  return Boolean(validProjectId && dataset)
}

function buildClient(): SanityClient {
  try {
    return createClient({
      apiVersion,
      dataset,
      perspective: "published",
      projectId: validProjectId || "placeholder0",
      token: readToken,
      useCdn: false,
    })
  } catch {
    // Return a stub client that never fetches — avoids build crash when
    // Sanity env vars are missing or invalid.
    return createClient({
      apiVersion,
      dataset: "production",
      perspective: "published",
      projectId: "placeholder0",
      useCdn: false,
    })
  }
}

export const sanityClient = buildClient()
