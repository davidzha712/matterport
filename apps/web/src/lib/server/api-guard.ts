import "server-only"

import { NextResponse } from "next/server"

type GuardOptions = {
  apiKeyEnvVar?: string
  maxRequests: number
  routeId: string
  windowMs: number
}

type RateLimitBucket = {
  count: number
  resetAt: number
}

const GLOBAL_RATE_LIMIT_KEY = "__matterportApiRouteRateLimitStore"

function getRateLimitStore(): Map<string, RateLimitBucket> {
  const globalScope = globalThis as typeof globalThis & {
    [GLOBAL_RATE_LIMIT_KEY]?: Map<string, RateLimitBucket>
  }

  if (!globalScope[GLOBAL_RATE_LIMIT_KEY]) {
    globalScope[GLOBAL_RATE_LIMIT_KEY] = new Map<string, RateLimitBucket>()
  }

  return globalScope[GLOBAL_RATE_LIMIT_KEY]
}

function getAllowedOrigins(request: Request): Set<string> {
  const allowed = new Set<string>([new URL(request.url).origin])
  const configured = process.env.ALLOWED_BROWSER_ORIGINS

  if (configured) {
    for (const origin of configured.split(",")) {
      const trimmed = origin.trim()
      if (trimmed) {
        allowed.add(trimmed)
      }
    }
  }

  return allowed
}

function isOriginAllowed(request: Request): boolean {
  const origin = request.headers.get("origin")
  if (!origin) {
    return true
  }

  return getAllowedOrigins(request).has(origin)
}

function hasValidApiKey(request: Request, apiKeyEnvVar?: string): boolean {
  if (!apiKeyEnvVar) {
    return true
  }

  const expected = process.env[apiKeyEnvVar]
  if (!expected) {
    return true
  }

  const authorization = request.headers.get("authorization")
  if (authorization === `Bearer ${expected}`) {
    return true
  }

  const apiKeyHeader = request.headers.get("x-api-key") ?? request.headers.get("x-internal-api-key")
  return apiKeyHeader === expected
}

function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const [first] = forwarded.split(",")
    if (first?.trim()) {
      return first.trim()
    }
  }

  const realIp = request.headers.get("x-real-ip")
  if (realIp?.trim()) {
    return realIp.trim()
  }

  return "anonymous"
}

function isRateLimited(request: Request, options: GuardOptions): boolean {
  const store = getRateLimitStore()
  const now = Date.now()
  const clientId = getClientIdentifier(request)
  const key = `${options.routeId}:${clientId}`
  const bucket = store.get(key)

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + options.windowMs })
    return false
  }

  if (bucket.count >= options.maxRequests) {
    return true
  }

  bucket.count += 1
  store.set(key, bucket)
  return false
}

export function guardApiRoute(request: Request, options: GuardOptions): NextResponse | null {
  if (!isOriginAllowed(request)) {
    return NextResponse.json({ detail: "Origin not allowed" }, { status: 403 })
  }

  if (!hasValidApiKey(request, options.apiKeyEnvVar)) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
  }

  if (isRateLimited(request, options)) {
    return NextResponse.json({ detail: "Rate limit exceeded" }, { status: 429 })
  }

  return null
}

export function isSafeAttachmentUrl(
  url: string,
  options?: { allowDataImages?: boolean; maxDataUrlChars?: number },
): boolean {
  const allowDataImages = options?.allowDataImages ?? false
  const maxDataUrlChars = options?.maxDataUrlChars ?? 5_000_000

  if (allowDataImages && url.startsWith("data:image/")) {
    return url.length <= maxDataUrlChars
  }

  try {
    const parsed = new URL(url)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

export function parsePositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) {
    return fallback
  }

  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function resetApiRouteGuardStateForTests() {
  getRateLimitStore().clear()
}
