import { NextResponse } from "next/server"
import { guardApiRoute, parsePositiveIntEnv } from "@/lib/server/api-guard"

const GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
const MAX_AUDIO_BYTES = 10 * 1024 * 1024
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/ogg",
  "audio/wav",
  "audio/mpeg",
  "audio/mp4",
])
const ALLOWED_AUDIO_EXTENSIONS = new Set(["webm", "ogg", "wav", "mp3", "m4a", "mp4"])

/**
 * Map UI locale to Whisper ISO-639-1 language code.
 * When no hint is provided, omit language to let Whisper auto-detect —
 * this allows multilingual input (DE + EN + ZH in same session).
 */
function resolveWhisperLanguage(hint: string | null): string | null {
  switch (hint) {
    case "de":
      return "de"
    case "en":
      return "en"
    case "zh":
      return "zh"
    default:
      // Auto-detect — supports mixed-language input
      return null
  }
}

export async function POST(request: Request) {
  const guard = guardApiRoute(request, {
    apiKeyEnvVar: "INTERNAL_API_ROUTE_KEY",
    maxRequests: parsePositiveIntEnv("TRANSCRIBE_RATE_LIMIT_MAX", 8),
    routeId: "transcribe",
    windowMs: parsePositiveIntEnv("TRANSCRIBE_RATE_LIMIT_WINDOW_MS", 60_000),
  })
  if (guard) {
    return guard
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY not configured" },
      { status: 500 }
    )
  }

  try {
    const contentLength = Number(request.headers.get("content-length") ?? "0")
    if (Number.isFinite(contentLength) && contentLength > MAX_AUDIO_BYTES + 1_000_000) {
      return NextResponse.json(
        { error: "Audio payload too large" },
        { status: 413 }
      )
    }

    const formData = await request.formData()
    const audioFile = formData.get("file") as File | null

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      )
    }

    const extension = audioFile.name.split(".").pop()?.toLowerCase()
    if (
      audioFile.size > MAX_AUDIO_BYTES ||
      !ALLOWED_AUDIO_TYPES.has(audioFile.type) ||
      !extension ||
      !ALLOWED_AUDIO_EXTENSIONS.has(extension)
    ) {
      return NextResponse.json(
        { error: "Invalid audio file" },
        { status: 400 }
      )
    }

    // Language hint from client (default: German, also support English + Chinese)
    const langHint = formData.get("language") as string | null
    const whisperLang = resolveWhisperLanguage(langHint)

    // Forward to Groq Whisper API
    const groqForm = new FormData()
    groqForm.append("file", audioFile, audioFile.name || "audio.webm")
    groqForm.append("model", "whisper-large-v3-turbo")
    groqForm.append("response_format", "json")
    if (whisperLang) {
      groqForm.append("language", whisperLang)
    }

    const groqResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: groqForm,
    })

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      console.error("Groq Whisper error:", errorText)
      return NextResponse.json(
        { error: "Transcription failed" },
        { status: groqResponse.status }
      )
    }

    const result = (await groqResponse.json()) as { text: string }
    return NextResponse.json({ text: result.text })
  } catch (error) {
    console.error("Transcribe route error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
