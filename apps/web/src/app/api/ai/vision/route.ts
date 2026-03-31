import { NextResponse } from "next/server"
import { guardApiRoute, isSafeAttachmentUrl, parsePositiveIntEnv } from "@/lib/server/api-guard"

// MiniMax Coding Plan API — Chinese mainland: api.minimaxi.com, Global: api.minimax.io
const MINIMAX_API_HOST = process.env.MINIMAX_API_HOST ?? "https://api.minimaxi.com"
const MAX_PROMPT_CHARS = 4000
const MAX_ATTACHMENTS = 6

type IncomingRequest = {
  input: {
    attachments?: Array<{ kind: string; label?: string; url: string }>
    prompt: string
    roomId?: string
    spaceId?: string
  }
  taskType: string
}

// Structured object detection result that maps to Matterport Tag.add() format:
//   Tag.add({ label, description, anchorPosition, stemVector, color })
// anchorPosition/stemVector are computed client-side from camera pose;
// the LLM provides label, description, color, and metadata.
type DetectedObject = {
  label: string
  description: string
  bbox: [number, number, number, number] | null
  category: string
  material: string
  condition: string
  confidence: number
  color: { r: number; g: number; b: number }
}

// ─── Category → tag color mapping (Matterport RGB 0.0–1.0) ───
const CATEGORY_COLORS: Record<string, { r: number; g: number; b: number }> = {
  furniture:    { r: 0.80, g: 0.55, b: 0.15 },
  lighting:     { r: 0.95, g: 0.85, b: 0.30 },
  artwork:      { r: 0.65, g: 0.20, b: 0.55 },
  textile:      { r: 0.30, g: 0.60, b: 0.80 },
  electronics:  { r: 0.20, g: 0.75, b: 0.60 },
  storage:      { r: 0.50, g: 0.40, b: 0.30 },
  decorative:   { r: 0.85, g: 0.45, b: 0.35 },
  architectural:{ r: 0.40, g: 0.40, b: 0.55 },
  unknown:      { r: 0.60, g: 0.60, b: 0.60 },
}

// ─── System prompts ───

const VISION_SYSTEM_PROMPT = [
  "You are an expert art and antiques appraiser working with an immersive 3D estate/museum platform (Matterport SDK).",
  "Respond in English. Use German names only for culturally specific terms (e.g. 'Biedermeier Kommode').",
  "",
  "Analyze the image and identify every distinct object, furniture piece, artwork, or notable element.",
  "Be SPECIFIC — do not say 'wooden table'; say 'Mid-century Danish teak dining table, circa 1960s, with tapered legs and extension leaf'.",
  "For each object you MUST provide:",
  "  - A specific label identifying what it actually is (style, period, type)",
  "  - A detailed description: material analysis, construction technique, condition assessment, distinguishing features, approximate era/style",
  "  - If web search context is available, use it to identify maker, style movement, or comparable auction pieces",
  "",
  "Do NOT estimate monetary value or provenance certainty. State that human expert review is required.",
  "",
  "You MUST end your response with a single JSON code block in exactly this format:",
  "```json",
  JSON.stringify({
    objects: [
      {
        label: "Mid-century Danish Teak Sideboard",
        description: "Solid teak construction with dovetail joints, sliding tambour doors revealing adjustable interior shelving. Tapered conical legs typical of 1960s Scandinavian design. Surface shows minor ring marks but original finish largely intact. Brass pull hardware, possibly Dansk or similar manufacturer.",
        bbox: [120, 50, 450, 380],
        category: "furniture",
        material: "wood/teak",
        condition: "good",
        confidence: 0.88,
      },
    ],
  }, null, 2),
  "```",
  "",
  "Rules for the JSON:",
  "- label: SPECIFIC identification — include style/period/type (e.g. 'Art Deco Bronze Table Lamp', 'Qing Dynasty Blue-and-White Porcelain Vase', 'Victorian Mahogany Bookcase')",
  "- description: 2-4 sentences covering material, construction, style indicators, condition, and any identifying marks",
  "- bbox: [x1, y1, x2, y2] bounding box in image pixel coordinates (top-left origin). REQUIRED for every object.",
  "- category: one of: furniture, lighting, artwork, textile, electronics, storage, decorative, architectural, unknown",
  "- material: be specific (e.g. 'wood/walnut', 'metal/brass', 'ceramic/porcelain', 'textile/silk')",
  "- condition: excellent, good, fair, poor, unknown — with reasoning in description",
  "- confidence: 0.0 to 1.0",
  "- List ALL distinct objects, even partially visible ones",
].join("\n")

const TEXT_SYSTEM_PROMPTS: Record<string, string> = {
  "narrative-summarize": [
    "You are a curatorial narrator for a digital twin platform.",
    "Respond in the same language as the user's prompt.",
    "Provide a rich narrative summary of the space/room context.",
    "Cover: room character, notable objects, spatial relationships, and preservation notes.",
  ].join("\n"),
  "workflow-assist": [
    "You are a workflow assistant for estate and museum inventory management.",
    "Respond in the same language as the user's prompt.",
    "Outline actionable steps for: evidence intake, human review, and export preparation.",
    "Flag items that need specialist attention.",
  ].join("\n"),
}

// ─── JSON extractor ───

function extractDetectedObjects(content: string): DetectedObject[] {
  // Try fenced JSON block first
  const jsonMatch = content.match(/```json\s*\n?([\s\S]*?)\n?```/)
  const raw = jsonMatch
    ? jsonMatch[1]
    : content.match(/\{"objects"\s*:\s*\[[\s\S]*?\]\s*\}/)?.[0]

  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as { objects?: unknown[] }
    if (!Array.isArray(parsed.objects)) return []

    return parsed.objects
      .filter((o): o is Record<string, unknown> => typeof o === "object" && o !== null && typeof (o as Record<string, unknown>).label === "string")
      .map((o) => {
        const category = typeof o.category === "string" ? o.category : "unknown"
        const rawBbox = Array.isArray(o.bbox) ? o.bbox : null
        const bbox: [number, number, number, number] | null =
          rawBbox && rawBbox.length === 4 && rawBbox.every((v: unknown) => typeof v === "number")
            ? (rawBbox as [number, number, number, number])
            : null
        return {
          label: String(o.label),
          description: typeof o.description === "string" ? o.description : "",
          bbox,
          category,
          material: typeof o.material === "string" ? o.material : "unknown",
          condition: typeof o.condition === "string" ? o.condition : "unknown",
          confidence: typeof o.confidence === "number" ? Math.min(1, Math.max(0, o.confidence)) : 0.5,
          color: CATEGORY_COLORS[category] ?? CATEGORY_COLORS.unknown,
        }
      })
  } catch {
    return []
  }
}

function cleanSummary(content: string): string {
  return content.replace(/```json[\s\S]*?```/g, "").trim()
}

// ─── MiniMax Coding Plan API helpers ───

type CodingPlanResponse = {
  base_resp: { status_code: number; status_msg: string }
  content?: string
  organic?: Array<{ title: string; link: string; snippet: string }>
}

async function codingPlanPost(
  apiKey: string,
  path: string,
  body: Record<string, unknown>,
  timeoutMs = 45_000
): Promise<CodingPlanResponse> {
  const response = await fetch(`${MINIMAX_API_HOST}${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  })

  const data = (await response.json()) as CodingPlanResponse
  if (data.base_resp?.status_code !== 0) {
    throw new Error(`MiniMax API error: ${data.base_resp?.status_msg ?? "unknown"} (${data.base_resp?.status_code})`)
  }
  return data
}

// ─── Web search for context enrichment ───

async function searchForContext(apiKey: string, query: string): Promise<string> {
  try {
    const data = await codingPlanPost(apiKey, "/v1/coding_plan/search", { q: query }, 10_000)
    const results = data.organic ?? []
    if (results.length === 0) return ""

    return results
      .slice(0, 3)
      .map((r) => `- ${r.title}: ${r.snippet.slice(0, 200)}`)
      .join("\n")
  } catch {
    return ""
  }
}

// ─── SSE helpers ───

type SSEEmit = (data: Record<string, unknown>) => void

function createSSEStream(
  handler: (emit: SSEEmit) => Promise<void>
): Response {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const emit: SSEEmit = (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        await handler(emit)
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI analysis failed"
        emit({ step: "error", progress: 0, message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  })
}

// ─── Route handler ───

function validateIncomingRequest(body: IncomingRequest): string | null {
  const allowedTaskTypes = new Set(["vision-detect", "narrative-summarize", "workflow-assist"])
  if (!allowedTaskTypes.has(body.taskType)) {
    return "Unsupported taskType"
  }

  const prompt = body.input?.prompt?.trim()
  if (!prompt) {
    return "Missing taskType or prompt"
  }

  if (prompt.length > MAX_PROMPT_CHARS) {
    return "Prompt too long"
  }

  if ((body.input.attachments?.length ?? 0) > MAX_ATTACHMENTS) {
    return "Too many attachments"
  }

  for (const attachment of body.input.attachments ?? []) {
    if (!attachment.url || !isSafeAttachmentUrl(attachment.url, { allowDataImages: true })) {
      return "Invalid attachment URL"
    }
  }

  if (body.taskType === "vision-detect") {
    const imageUrl = body.input.attachments?.find((attachment) => attachment.kind === "image")?.url
    if (!imageUrl) {
      return "Vision tasks require at least one image attachment"
    }
  }

  return null
}

export async function POST(request: Request) {
  const guard = guardApiRoute(request, {
    apiKeyEnvVar: "INTERNAL_API_ROUTE_KEY",
    maxRequests: parsePositiveIntEnv("AI_VISION_RATE_LIMIT_MAX", 12),
    routeId: "ai-vision",
    windowMs: parsePositiveIntEnv("AI_VISION_RATE_LIMIT_WINDOW_MS", 60_000),
  })
  if (guard) {
    return guard
  }

  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { detail: "MINIMAX_API_KEY not configured" },
      { status: 500 }
    )
  }

  let body: IncomingRequest
  try {
    body = (await request.json()) as IncomingRequest
  } catch {
    return NextResponse.json({ detail: "Invalid request body" }, { status: 400 })
  }

  const { taskType, input } = body
  const validationError = validateIncomingRequest(body)
  if (validationError) {
    return NextResponse.json({ detail: validationError }, { status: 400 })
  }

  return createSSEStream(async (emit) => {
    if (taskType === "vision-detect") {
      await streamVision(apiKey, input, emit)
    } else {
      await streamText(apiKey, taskType, input, emit)
    }
  })
}

// ─── Vision: web search → VLM with enriched prompt (streaming) ───

async function streamVision(
  apiKey: string,
  input: IncomingRequest["input"],
  emit: SSEEmit
) {
  const imageAttachment = input.attachments?.find((a) => a.kind === "image")
  if (!imageAttachment?.url) {
    emit({ step: "error", progress: 0, message: "Vision tasks require at least one image attachment" })
    return
  }
  const imageUrl = imageAttachment.url

  // Step 1: Web search for context enrichment
  emit({ step: "search", progress: 10 })
  const searchContext = await searchForContext(apiKey, input.prompt)
  emit({ step: "search", progress: 25, hasContext: searchContext.length > 0 })

  // Step 2: Build enriched VLM prompt
  const promptParts = [
    VISION_SYSTEM_PROMPT,
    "",
    `Space: ${input.spaceId ?? "unknown"}`,
    `Room: ${input.roomId ?? "unknown"}`,
    `User request: ${input.prompt}`,
  ]

  if (searchContext) {
    promptParts.push(
      "",
      "Web search context (use to refine identification):",
      searchContext
    )
  }

  // Step 3: Call VLM with image
  emit({ step: "vlm", progress: 30 })
  const data = await codingPlanPost(
    apiKey,
    "/v1/coding_plan/vlm",
    { prompt: promptParts.join("\n"), image_url: imageUrl },
    60_000
  )

  const content = typeof data.content === "string" ? data.content.trim() : ""
  if (!content) {
    emit({ step: "error", progress: 0, message: "VLM returned empty response" })
    return
  }

  emit({ step: "vlm", progress: 75 })

  // Step 4: Parse & extract objects
  emit({ step: "parse", progress: 80 })
  const objects = extractDetectedObjects(content)
  const tagReadyObjects = objects.map((obj) => ({
    label: obj.label,
    description: obj.description,
    bbox: obj.bbox,
    category: obj.category,
    material: obj.material,
    condition: obj.condition,
    confidence: obj.confidence,
    color: obj.color,
  }))

  // Step 5: Done
  emit({
    step: "done",
    progress: 100,
    objectCount: objects.length,
    result: {
      taskType: "vision-detect",
      output: {
        summary: cleanSummary(content),
        structuredData: {
          spaceId: input.spaceId,
          roomId: input.roomId,
          deliveryMode: searchContext ? "vlm+search" : "vlm",
          model: "MiniMax VLM",
          objects: tagReadyObjects,
        },
        warnings: ["Vision detections require human confirmation before workflow changes."],
      },
      provider: { providerId: "minimax", configured: true, reason: "direct" },
    },
  })
}

// ─── Text tasks (streaming) ───

async function streamText(
  apiKey: string,
  taskType: string,
  input: IncomingRequest["input"],
  emit: SSEEmit
) {
  const systemPrompt = TEXT_SYSTEM_PROMPTS[taskType] ?? TEXT_SYSTEM_PROMPTS["workflow-assist"]
  const imageUrl = input.attachments?.find((a) => a.kind === "image")?.url

  emit({ step: "search", progress: 10 })
  const searchContext = await searchForContext(apiKey, input.prompt)
  emit({ step: "search", progress: 25, hasContext: searchContext.length > 0 })

  if (imageUrl) {
    const promptParts = [
      systemPrompt,
      "",
      `Task type: ${taskType}`,
      `Space: ${input.spaceId ?? "unknown"}`,
      `Room: ${input.roomId ?? "unknown"}`,
      `Prompt: ${input.prompt}`,
    ]
    if (searchContext) {
      promptParts.push("", "Web search context:", searchContext)
    }

    emit({ step: "vlm", progress: 30 })
    const data = await codingPlanPost(
      apiKey,
      "/v1/coding_plan/vlm",
      { prompt: promptParts.join("\n"), image_url: imageUrl },
      45_000
    )
    const content = typeof data.content === "string" ? data.content.trim() : ""

    emit({
      step: "done",
      progress: 100,
      result: {
        taskType,
        output: {
          summary: content || "Analysis could not produce results.",
          structuredData: {
            spaceId: input.spaceId,
            roomId: input.roomId,
            deliveryMode: searchContext ? "vlm+search" : "vlm",
            model: "MiniMax VLM",
          },
          warnings: ["AI outputs require human review before any workflow changes."],
        },
        provider: { providerId: "minimax", configured: true, reason: "direct" },
      },
    })
    return
  }

  // No image — build summary from web search results
  emit({ step: "vlm", progress: 40 })
  const searchResults = await getSearchResults(apiKey, input.prompt)

  const summary = searchResults.length > 0
    ? [
        `${systemPrompt}\n`,
        `Space: ${input.spaceId ?? "unknown"}, Room: ${input.roomId ?? "unknown"}`,
        `Query: ${input.prompt}\n`,
        "Related information from web search:",
        ...searchResults.map((r, i) => `${i + 1}. **${r.title}**\n   ${r.snippet}`),
        "\n*Note: Full AI narrative requires an image attachment for VLM analysis. Above results are from web search.*",
      ].join("\n")
    : "No results available. Please attach an image for full AI analysis, or try a different search query."

  emit({
    step: "done",
    progress: 100,
    result: {
      taskType,
      output: {
        summary,
        structuredData: {
          spaceId: input.spaceId,
          roomId: input.roomId,
          deliveryMode: "search-only",
          model: "Coding Plan Search",
        },
        warnings: ["Text tasks without images use web search only. Attach an image for full VLM analysis."],
      },
      provider: { providerId: "minimax", configured: true, reason: "direct" },
    },
  })
}

async function getSearchResults(
  apiKey: string,
  query: string
): Promise<Array<{ title: string; snippet: string; link: string }>> {
  try {
    const data = await codingPlanPost(apiKey, "/v1/coding_plan/search", { q: query }, 10_000)
    return (data.organic ?? []).slice(0, 5).map((r) => ({
      title: r.title,
      snippet: r.snippet,
      link: r.link,
    }))
  } catch {
    return []
  }
}
