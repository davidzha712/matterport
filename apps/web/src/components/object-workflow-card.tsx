"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { useT } from "@/lib/i18n"
import type { ObjectRecord } from "@/lib/platform-types"
import { toDisplayDisposition, toDisplayObjectStatus, toToneToken } from "@/lib/presentation"

type WorkflowUpdateResponse = {
  auditEvent: {
    id: string
  }
  objectRecord: ObjectRecord
  workflow: {
    approvedCount: number
    pendingReviewCount: number
    reviewedCount: number
  }
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

async function patchObject(
  updates: { id: string } & Partial<ObjectRecord>,
): Promise<ObjectRecord> {
  const response = await fetch("/api/objects", {
    body: JSON.stringify(updates),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null
    throw new Error(payload?.detail ?? "Save failed")
  }

  const payload = (await response.json()) as { object: ObjectRecord }
  return payload.object
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

export function ObjectWorkflowCard({
  objectRecord,
  objectRoute,
  spaceId,
}: {
  objectRecord: ObjectRecord
  objectRoute: string
  spaceId: string
}) {
  const router = useRouter()
  const t = useT()
  const [currentObject, setCurrentObject] = useState(objectRecord)
  const [note, setNote] = useState("")
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isSaving, setIsSaving] = useState(false)

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Photo upload ref
  const photoInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  // Clean up media recorder on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  function updateObject(disposition: ObjectRecord["disposition"]) {
    setFeedback(null)
    setError(null)
    setIsSaving(true)

    void (async () => {
      try {
        const response = await fetch(
          `/api/spaces/${spaceId}/objects/${currentObject.id}`,
          {
            body: JSON.stringify({
              disposition,
              note: note || undefined,
              reviewer: "immersive-shell",
            }),
            headers: {
              "Content-Type": "application/json",
            },
            method: "PATCH",
          },
        )

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { detail?: string } | null
          throw new Error(payload?.detail ?? t.objectCard.saveFailed)
        }

        const payload = (await response.json()) as WorkflowUpdateResponse
        setCurrentObject(payload.objectRecord)
        setFeedback(
          `${toDisplayDisposition(payload.objectRecord.disposition)} ${t.objectCard.savedFeedback} ${payload.workflow.pendingReviewCount} ${t.objectCard.openReviewsRemain}`
        )
        setNote("")
        window.dispatchEvent(new CustomEvent("workflow-updated", { detail: { spaceId } }))
        startTransition(() => {
          router.refresh()
        })
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : t.objectCard.saveFailed
        )
      } finally {
        setIsSaving(false)
      }
    })()
  }

  const handleVoiceToggle = useCallback(() => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop()
      }
      return
    }

    // Start recording
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : "audio/ogg"

        const recorder = new MediaRecorder(stream, { mimeType })
        mediaRecorderRef.current = recorder
        audioChunksRef.current = []

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current = [...audioChunksRef.current, event.data]
          }
        }

        recorder.onstop = () => {
          // Stop all tracks to release the microphone
          stream.getTracks().forEach((track) => track.stop())
          setIsRecording(false)

          const chunks = audioChunksRef.current
          if (chunks.length === 0) return

          const audioBlob = new Blob(chunks, { type: mimeType })
          setIsTranscribing(true)

          void (async () => {
            try {
              const formData = new FormData()
              formData.append("file", audioBlob, "recording.webm")

              const transcribeResponse = await fetch("/api/transcribe", {
                body: formData,
                method: "POST",
              })

              if (!transcribeResponse.ok) {
                throw new Error("Transcription request failed")
              }

              const transcribeResult = (await transcribeResponse.json()) as { text: string }
              const transcription = transcribeResult.text.trim()

              if (!transcription) return

              const newNote = {
                id: generateId(),
                text: transcription,
                createdAt: new Date().toISOString(),
              }

              const existingNotes = currentObject.voiceNotes ?? []
              const updated = await patchObject({
                id: currentObject.id,
                voiceNotes: [...existingNotes, newNote],
              })

              setCurrentObject(updated)
            } catch (caughtError) {
              setError(
                caughtError instanceof Error
                  ? caughtError.message
                  : t.objectCard.saveFailed
              )
            } finally {
              setIsTranscribing(false)
            }
          })()
        }

        recorder.start()
        setIsRecording(true)
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Microphone access denied"
        )
      }
    })()
  }, [isRecording, currentObject.id, currentObject.voiceNotes, t.objectCard.saveFailed])

  const handlePhotoSelected = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      // Reset input so the same file can be selected again if needed
      event.target.value = ""

      try {
        const dataUrl = await fileToDataUrl(file)
        const newPhoto = {
          id: generateId(),
          url: dataUrl,
          createdAt: new Date().toISOString(),
        }

        const existingPhotos = currentObject.photos ?? []
        const updated = await patchObject({
          id: currentObject.id,
          photos: [...existingPhotos, newPhoto],
        })

        setCurrentObject(updated)
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : t.objectCard.saveFailed
        )
      }
    },
    [currentObject.id, currentObject.photos, t.objectCard.saveFailed],
  )

  const handleDocSelected = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      event.target.value = ""

      try {
        const dataUrl = await fileToDataUrl(file)
        const newPhoto = {
          id: generateId(),
          url: dataUrl,
          createdAt: new Date().toISOString(),
        }

        const existingPhotos = currentObject.photos ?? []
        const updated = await patchObject({
          id: currentObject.id,
          photos: [...existingPhotos, newPhoto],
        })

        setCurrentObject(updated)
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : t.objectCard.saveFailed
        )
      }
    },
    [currentObject.id, currentObject.photos, t.objectCard.saveFailed],
  )

  const voiceButtonLabel = isRecording
    ? t.objectCard.stopRecording
    : isTranscribing
      ? t.objectCard.transcribing
      : t.objectCard.recordVoice

  return (
    <section className="context-card context-card--hero">
      <div className="context-card__tabs" aria-hidden="true">
        <span className="context-tab context-tab--active">{t.objectCard.objectLevel}</span>
        <span className="context-tab">{t.objectCard.room}</span>
        <span className="context-tab">{t.objectCard.workflow}</span>
        <span className="context-tab">{t.objectCard.history}</span>
      </div>
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t.objectCard.selectedObject}</p>
          <h2>{currentObject.title}</h2>
        </div>
        <span className={`pill pill--${toToneToken(currentObject.status)}`}>
          {toDisplayObjectStatus(currentObject.status)}
        </span>
      </div>
      <p>{currentObject.aiSummary}</p>
      <dl className="context-meta-grid">
        <div>
          <dt>{t.objectCard.type}</dt>
          <dd>{currentObject.type}</dd>
        </div>
        <div>
          <dt>{t.objectCard.room}</dt>
          <dd>{currentObject.roomName}</dd>
        </div>
        <div>
          <dt>{t.objectCard.disposition}</dt>
          <dd>{toDisplayDisposition(currentObject.disposition)}</dd>
        </div>
        <div>
          <dt>{t.objectCard.aiStatus}</dt>
          <dd>{t.objectCard.recommendationOnly}</dd>
        </div>
      </dl>
      <div className="knowledge-strip" aria-label={t.objectCard.objectLevel}>
        <span>{t.objectCard.metadataActive}</span>
        <span>{t.objectCard.reviewFirst}</span>
        <span>{t.objectCard.openLayerCapable}</span>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={photoInputRef}
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handlePhotoSelected}
        tabIndex={-1}
        type="file"
      />
      <input
        ref={docInputRef}
        accept="image/*,.pdf"
        className="sr-only"
        onChange={handleDocSelected}
        tabIndex={-1}
        type="file"
      />

      <div className="asset-strip" aria-label={t.objectCard.objectLevel}>
        {/* Photo upload */}
        <button
          className="asset-strip__card"
          disabled={isTranscribing}
          onClick={() => photoInputRef.current?.click()}
          type="button"
        >
          {t.objectCard.uploadPhoto}
        </button>

        {/* Document scan */}
        <button
          className="asset-strip__card"
          disabled={isTranscribing}
          onClick={() => docInputRef.current?.click()}
          type="button"
        >
          {t.objectCard.scanDocument}
        </button>

        {/* Voice note */}
        <button
          aria-pressed={isRecording}
          className={`asset-strip__card${isRecording ? " asset-strip__card--recording" : ""}`}
          disabled={isTranscribing}
          onClick={handleVoiceToggle}
          type="button"
        >
          {isRecording ? (
            <span className="asset-strip__recording-label">
              <span className="asset-strip__rec-dot" aria-hidden="true" />
              {t.objectCard.recording}
            </span>
          ) : (
            voiceButtonLabel
          )}
        </button>
      </div>

      {/* Photo thumbnails */}
      {currentObject.photos && currentObject.photos.length > 0 ? (
        <div className="asset-thumbnails" aria-label={t.objectCard.photoAttached}>
          {currentObject.photos.map((photo) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={photo.id}
              alt={t.objectCard.photoAttached}
              className="asset-thumbnail"
              src={photo.url}
            />
          ))}
        </div>
      ) : null}

      {/* Voice note transcriptions */}
      {currentObject.voiceNotes && currentObject.voiceNotes.length > 0 ? (
        <ul className="voice-note-list" aria-label={t.objectCard.recordVoice}>
          {currentObject.voiceNotes.map((vn) => (
            <li key={vn.id} className="voice-note-item">
              {vn.text}
            </li>
          ))}
        </ul>
      ) : null}

      <label className="workflow-note">
        <span className="eyebrow">{t.objectCard.auditNote}</span>
        <input
          autoComplete="off"
          name="workflow-note"
          onChange={(event) => setNote(event.target.value)}
          placeholder={t.objectCard.auditNotePlaceholder}
          spellCheck={false}
          type="text"
          value={note}
        />
      </label>
      <div className="action-matrix" aria-label="Disposition actions">
        <button
          className="action-matrix__button action-matrix__button--keep"
          disabled={isPending || isSaving}
          onClick={() => updateObject("Keep")}
          type="button"
        >
          {t.objectCard.keep}
        </button>
        <button
          className="action-matrix__button action-matrix__button--sell"
          disabled={isPending || isSaving}
          onClick={() => updateObject("Sell")}
          type="button"
        >
          {t.objectCard.sell}
        </button>
        <button
          className="action-matrix__button action-matrix__button--donate"
          disabled={isPending || isSaving}
          onClick={() => updateObject("Donate")}
          type="button"
        >
          {t.objectCard.donate}
        </button>
        <button
          className="action-matrix__button action-matrix__button--archive"
          disabled={isPending || isSaving}
          onClick={() => updateObject("Archive")}
          type="button"
        >
          {t.objectCard.archive}
        </button>
      </div>
      {feedback ? (
        <p aria-live="polite" className="workflow-feedback">
          {feedback}
        </p>
      ) : null}
      {error ? (
        <p aria-live="polite" className="workflow-feedback workflow-feedback--error">
          {error}
        </p>
      ) : null}
      <Link className="primary-link" href={objectRoute}>
        {t.objectCard.openDossier}
      </Link>
    </section>
  )
}
