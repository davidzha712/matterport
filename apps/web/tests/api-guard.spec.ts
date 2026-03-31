import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
import {
  guardApiRoute,
  isSafeAttachmentUrl,
  resetApiRouteGuardStateForTests,
} from "../src/lib/server/api-guard"

describe("api route guard", () => {
  afterEach(() => {
    delete process.env.INTERNAL_API_ROUTE_KEY
    resetApiRouteGuardStateForTests()
  })

  it("allows same-origin requests by default", () => {
    const request = new Request("http://localhost:3100/api/ai/vision", {
      headers: {
        origin: "http://localhost:3100",
      },
      method: "POST",
    })

    expect(
      guardApiRoute(request, {
        maxRequests: 3,
        routeId: "test-route",
        windowMs: 60_000,
      }),
    ).toBeNull()
  })

  it("blocks cross-origin requests", async () => {
    const request = new Request("http://localhost:3100/api/ai/vision", {
      headers: {
        origin: "https://evil.example",
      },
      method: "POST",
    })

    const response = guardApiRoute(request, {
      maxRequests: 3,
      routeId: "test-route",
      windowMs: 60_000,
    })

    expect(response?.status).toBe(403)
    await expect(response?.json()).resolves.toEqual({ detail: "Origin not allowed" })
  })

  it("requires a shared key when configured", async () => {
    process.env.INTERNAL_API_ROUTE_KEY = "secret-token"

    const blockedRequest = new Request("http://localhost:3100/api/transcribe", {
      method: "POST",
    })
    const allowedRequest = new Request("http://localhost:3100/api/transcribe", {
      headers: {
        authorization: "Bearer secret-token",
      },
      method: "POST",
    })

    const blockedResponse = guardApiRoute(blockedRequest, {
      apiKeyEnvVar: "INTERNAL_API_ROUTE_KEY",
      maxRequests: 3,
      routeId: "test-route",
      windowMs: 60_000,
    })

    expect(blockedResponse?.status).toBe(401)
    await expect(blockedResponse?.json()).resolves.toEqual({ detail: "Unauthorized" })

    expect(
      guardApiRoute(allowedRequest, {
        apiKeyEnvVar: "INTERNAL_API_ROUTE_KEY",
        maxRequests: 3,
        routeId: "test-route",
        windowMs: 60_000,
      }),
    ).toBeNull()
  })

  it("rate limits repeated requests from the same client", async () => {
    const createRequest = () =>
      new Request("http://localhost:3100/api/ai/vision", {
        headers: {
          "x-forwarded-for": "203.0.113.8",
        },
        method: "POST",
      })

    expect(
      guardApiRoute(createRequest(), {
        maxRequests: 2,
        routeId: "test-route",
        windowMs: 60_000,
      }),
    ).toBeNull()
    expect(
      guardApiRoute(createRequest(), {
        maxRequests: 2,
        routeId: "test-route",
        windowMs: 60_000,
      }),
    ).toBeNull()

    const blockedResponse = guardApiRoute(createRequest(), {
      maxRequests: 2,
      routeId: "test-route",
      windowMs: 60_000,
    })

    expect(blockedResponse?.status).toBe(429)
    await expect(blockedResponse?.json()).resolves.toEqual({ detail: "Rate limit exceeded" })
  })

  it("accepts safe remote URLs and bounded data URLs", () => {
    expect(isSafeAttachmentUrl("https://example.com/image.jpg")).toBe(true)
    expect(isSafeAttachmentUrl("data:image/png;base64,abc", { allowDataImages: true })).toBe(true)
    expect(isSafeAttachmentUrl("javascript:alert(1)", { allowDataImages: true })).toBe(false)
  })
})
