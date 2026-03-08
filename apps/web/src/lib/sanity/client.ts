import "server-only"

import { createClient } from "next-sanity"

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? ""
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
export const apiVersion = process.env.SANITY_API_VERSION || "2024-01-01"
const readToken = process.env.SANITY_API_READ_TOKEN

export function isSanityConfigured() {
  return Boolean(projectId && dataset)
}

export const sanityClient = createClient({
  apiVersion,
  dataset,
  perspective: "published",
  projectId: projectId || "placeholder",
  token: readToken,
  useCdn: false
})
