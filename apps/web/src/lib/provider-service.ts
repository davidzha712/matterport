import "server-only"

import { cache } from "react"
import type { ProviderProfile } from "@/lib/platform-types"
import { isSanityConfigured, sanityClient } from "@/lib/sanity/client"
import { mapSnapshotToProviders, type SanitySnapshot } from "@/lib/sanity/mappers"
import { controlRoomSnapshotQuery } from "@/lib/sanity/queries"

type ProviderApiResponse = {
  items: Array<{
    configured: boolean
    id: string
    label: string
    preferredFor: string[]
    taskClasses: string[]
  }>
}

function resolveServerApiBaseUrl() {
  return process.env.MATTERPORT_PLATFORM_API_URL ?? "http://127.0.0.1:8000"
}

const getSanitySnapshot = cache(async (): Promise<SanitySnapshot | null> => {
  if (!isSanityConfigured()) {
    return null
  }

  try {
    return await sanityClient.fetch<SanitySnapshot>(controlRoomSnapshotQuery)
  } catch {
    return null
  }
})

async function getBackendProviderConfiguration(): Promise<Map<string, boolean>> {
  try {
    const response = await fetch(`${resolveServerApiBaseUrl()}/api/v1/providers`, {
      cache: "no-store"
    })

    if (!response.ok) {
      return new Map()
    }

    const payload = (await response.json()) as ProviderApiResponse
    return new Map(payload.items.map((item) => [item.id, item.configured]))
  } catch {
    return new Map()
  }
}

export async function getRuntimeProviderProfiles(): Promise<ProviderProfile[]> {
  const snapshot = await getSanitySnapshot()
  const providerProfiles = snapshot
    ? mapSnapshotToProviders(snapshot)
    : []

  if (providerProfiles.length === 0) {
    return []
  }

  const configuredState = await getBackendProviderConfiguration()

  if (configuredState.size === 0) {
    return providerProfiles
  }

  return providerProfiles.map((provider) =>
    configuredState.has(provider.id)
      ? {
          ...provider,
          configured: configuredState.get(provider.id),
        }
      : provider
  )
}
