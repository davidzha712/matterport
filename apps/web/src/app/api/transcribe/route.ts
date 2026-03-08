import { NextResponse } from "next/server"

const GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions"

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY not configured" },
      { status: 500 }
    )
  }

  try {
    const formData = await request.formData()
    const audioFile = formData.get("file") as File | null

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      )
    }

    // Forward to Groq Whisper API
    const groqForm = new FormData()
    groqForm.append("file", audioFile, audioFile.name || "audio.webm")
    groqForm.append("model", "whisper-large-v3-turbo")
    groqForm.append("response_format", "json")

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
