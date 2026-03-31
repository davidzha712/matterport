"use client"

import { useCallback, useRef, useState } from "react"

type VoiceState = "idle" | "recording" | "transcribing"

type VoiceInputOptions = {
  /** ISO locale hint for Whisper (e.g. "de", "en"). Omit for auto-detect. */
  locale?: string
}

export function useVoiceInput(onTranscript: (text: string) => void, options?: VoiceInputOptions) {
  const [state, setState] = useState<VoiceState>("idle")
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const locale = options?.locale

  const startRecording = useCallback(async () => {
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Prefer webm/opus, fallback to whatever is available
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4"

      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current = [...chunksRef.current, e.data]
        }
      }

      recorder.onstop = async () => {
        // Stop all tracks to release microphone
        for (const track of stream.getTracks()) {
          track.stop()
        }

        const audioBlob = new Blob(chunksRef.current, { type: mimeType })
        chunksRef.current = []

        if (audioBlob.size < 100) {
          setState("idle")
          setError("Recording too short")
          return
        }

        setState("transcribing")

        try {
          const formData = new FormData()
          const ext = mimeType.includes("webm") ? "webm" : "mp4"
          formData.append("file", audioBlob, `recording.${ext}`)
          if (locale) {
            formData.append("language", locale)
          }

          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          })

          if (!response.ok) {
            throw new Error("Transcription failed")
          }

          const result = (await response.json()) as { text: string }
          if (result.text?.trim()) {
            onTranscript(result.text.trim())
          }
        } catch {
          setError("Transcription failed")
        } finally {
          setState("idle")
        }
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setState("recording")
    } catch {
      setError("Microphone access denied")
      setState("idle")
    }
  }, [locale, onTranscript])

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state === "recording") {
      recorder.stop()
    }
  }, [])

  const toggleRecording = useCallback(() => {
    if (state === "recording") {
      stopRecording()
    } else if (state === "idle") {
      void startRecording()
    }
  }, [state, startRecording, stopRecording])

  return {
    state,
    error,
    isRecording: state === "recording",
    isTranscribing: state === "transcribing",
    toggleRecording,
    startRecording,
    stopRecording,
  }
}
