import "server-only"

import type { ProviderProfile } from "@/lib/mock-data"
import { getProviderProfiles as getMockProviderProfiles } from "@/lib/mock-data"

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

function mapProvider(item: ProviderApiResponse["items"][number]): ProviderProfile {
  return {
    bestFor: item.preferredFor,
    configured: item.configured,
    fallbackClass: item.taskClasses[0] ?? "generalist",
    id: item.id,
    label: item.label,
    specialty: item.preferredFor.join(", "),
    status: item.configured ? "Active" : "Pilot"
  }
}

export async function getRuntimeProviderProfiles(): Promise<ProviderProfile[]> {
  try {
    const response = await fetch(`${resolveServerApiBaseUrl()}/api/v1/providers`, {
      cache: "no-store"
    })

    if (!response.ok) {
      return getMockProviderProfiles()
    }

    const payload = (await response.json()) as ProviderApiResponse
    return payload.items.map(mapProvider)
  } catch {
    return getMockProviderProfiles()
  }
}
