import { NextResponse } from "next/server"

const MINIMAX_API_HOST = process.env.MINIMAX_API_HOST ?? "https://api.minimax.io"
const MINIMAX_CHAT_URL = process.env.MINIMAX_API_BASE_URL ?? "https://api.minimaxi.chat/v1"

type VisionRequest = {
  imageUrl: string
  prompt: string
  roomId?: string
  spaceId?: string
}

type TextRequest = {
  prompt: string
  roomId?: string
  spaceId?: string
  taskType: "narrative-summarize" | "workflow-assist"
}

type IncomingRequest = {
  input: {
    attachments?: Array<{ kind: string; label?: string; url: string }>
    prompt: string
    roomId?: string
    spaceId?: string
  }
  taskType: string
}

const SYSTEM_PROMPTS: Record<string, string> = {
  "vision-detect": [
    "You are a multimodal collections analyst for an immersive estate and museum platform.",
    "Respond in the same language as the user's prompt.",
    "Identify the most salient objects, likely materials, visible condition clues, and any ambiguities.",
    "Do not estimate price, provenance certainty, or irreversible disposition.",
    "State clearly that human review is required before workflow changes.",
  ].join("\n"),
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

export async function POST(request: Request) {
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
  if (!taskType || !input?.prompt) {
    return NextResponse.json({ detail: "Missing taskType or prompt" }, { status: 400 })
  }

  try {
    if (taskType === "vision-detect") {
      return await handleVision(apiKey, input)
    }
    return await handleText(apiKey, taskType, input)
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI analysis failed"
    return NextResponse.json({ detail: message }, { status: 502 })
  }
}

async function handleVision(
  apiKey: string,
  input: IncomingRequest["input"]
) {
  const imageUrl = input.attachments?.find((a) => a.kind === "image")?.url
  if (!imageUrl) {
    return NextResponse.json(
      { detail: "Vision tasks require at least one image attachment" },
      { status: 400 }
    )
  }

  // Try MiniMax native VLM endpoint
  const visionPayload = {
    prompt: [
      SYSTEM_PROMPTS["vision-detect"],
      `Space: ${input.spaceId ?? "unknown"}`,
      `Room: ${input.roomId ?? "unknown"}`,
      `User request: ${input.prompt}`,
    ].join("\n"),
    image_url: imageUrl,
  }

  const response = await fetch(`${MINIMAX_API_HOST}/v1/coding_plan/vlm`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(visionPayload),
  })

  // If native VLM fails, fall back to chat completions with image
  if (!response.ok) {
    return await handleVisionViaChatCompletions(apiKey, input, imageUrl)
  }

  const data = (await response.json()) as Record<string, unknown>

  // Check for MiniMax API-level errors
  const baseResp = data.base_resp as Record<string, unknown> | undefined
  if (baseResp && baseResp.status_code !== 0 && baseResp.status_code !== "0") {
    return await handleVisionViaChatCompletions(apiKey, input, imageUrl)
  }

  const content = typeof data.content === "string" ? data.content.trim() : ""
  if (!content) {
    return await handleVisionViaChatCompletions(apiKey, input, imageUrl)
  }

  return NextResponse.json({
    taskType: "vision-detect",
    output: {
      summary: content,
      structuredData: {
        spaceId: input.spaceId,
        roomId: input.roomId,
        deliveryMode: "native-vlm",
        model: "MiniMax VLM",
      },
      warnings: ["Vision detections require human confirmation before workflow changes."],
    },
    provider: { providerId: "minimax", configured: true, reason: "direct" },
  })
}

async function handleVisionViaChatCompletions(
  apiKey: string,
  input: IncomingRequest["input"],
  imageUrl: string
) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPTS["vision-detect"] },
    {
      role: "user",
      content: [
        { type: "text", text: `${input.prompt}\nSpace: ${input.spaceId ?? "unknown"}, Room: ${input.roomId ?? "unknown"}` },
        { type: "image_url", image_url: { url: imageUrl } },
      ],
    },
  ]

  const response = await fetch(`${MINIMAX_CHAT_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "MiniMax-M1",
      messages,
      temperature: 0.4,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "unknown error")
    throw new Error(`MiniMax chat API error: ${response.status} - ${errorText.slice(0, 200)}`)
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content?.trim() ?? ""

  return NextResponse.json({
    taskType: "vision-detect",
    output: {
      summary: content || "No objects detected in this view.",
      structuredData: {
        spaceId: input.spaceId,
        roomId: input.roomId,
        deliveryMode: "chat-completions-vision",
        model: "MiniMax-M1",
      },
      warnings: ["Vision detections require human confirmation before workflow changes."],
    },
    provider: { providerId: "minimax", configured: true, reason: "chat-fallback" },
  })
}

async function handleText(
  apiKey: string,
  taskType: string,
  input: IncomingRequest["input"]
) {
  const systemPrompt = SYSTEM_PROMPTS[taskType] ?? SYSTEM_PROMPTS["workflow-assist"]
  const userMessage = [
    `Task type: ${taskType}`,
    `Space: ${input.spaceId ?? "unknown"}`,
    `Room: ${input.roomId ?? "unknown"}`,
    `Prompt: ${input.prompt}`,
  ].join("\n")

  const response = await fetch(`${MINIMAX_CHAT_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "MiniMax-M1",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.4,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "unknown error")
    throw new Error(`MiniMax API error: ${response.status} - ${errorText.slice(0, 200)}`)
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content?.trim() ?? ""

  return NextResponse.json({
    taskType,
    output: {
      summary: content || "Analysis could not produce results.",
      structuredData: {
        spaceId: input.spaceId,
        roomId: input.roomId,
        deliveryMode: "chat-completions",
        model: "MiniMax-M1",
      },
      warnings: ["AI outputs require human review before any workflow changes."],
    },
    provider: { providerId: "minimax", configured: true, reason: "direct" },
  })
}
