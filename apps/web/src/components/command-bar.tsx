"use client"

import type { ChangeEvent, FormEvent } from "react"
import { useDeferredValue, useState, useTransition } from "react"
import { getBrowserApiBaseUrl } from "@/lib/browser-api"
import type { RoomRecord, SpaceRecord } from "@/lib/mock-data"

type TaskType = "vision-detect" | "narrative-summarize" | "workflow-assist"

type CommandBarProps = {
  room?: RoomRecord
  space: SpaceRecord
}

type AIResponse = {
  output: {
    structuredData: Record<string, string | number | boolean | null | string[] | undefined>
    summary: string
    warnings: string[]
  }
  provider: {
    configured: boolean
    providerId: string
    reason: string
  }
  taskType: TaskType
}

type QuickAction = {
  label: string
  prompt: string
  taskType: TaskType
}

type ImageAttachmentState = {
  label: string
  origin: "inline-upload" | "remote-url"
  previewUrl: string
  url: string
}

const quickActions: QuickAction[] = [
  {
    label: "Objekte erkennen",
    prompt: "Erkenne die wichtigsten Objekte in diesem Raum und markiere Kandidaten fuer die menschliche Pruefung.",
    taskType: "vision-detect"
  },
  {
    label: "Raum erzaehlen",
    prompt: "Schreibe eine kuratorische Zusammenfassung dieses Raums fuer eine hochwertige digitale Fuehrung.",
    taskType: "narrative-summarize"
  },
  {
    label: "Workflow planen",
    prompt: "Leite einen sicheren Arbeitsablauf fuer Sichtung, Freigabe und Export dieses Raums ab.",
    taskType: "workflow-assist"
  }
]

const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"])
const maxImageBytes = 8 * 1024 * 1024

export function CommandBar({ room, space }: CommandBarProps) {
  const [taskType, setTaskType] = useState<TaskType>("vision-detect")
  const [command, setCommand] = useState(
    `Erkenne die wichtigsten Objekte in ${room?.name ?? space.name} und gruppiere sie fuer die Pruefung.`
  )
  const [imageUrl, setImageUrl] = useState("")
  const [imageAttachment, setImageAttachment] = useState<ImageAttachmentState | null>(null)
  const [isReadingImage, setIsReadingImage] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<AIResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const deferredCommand = useDeferredValue(command)
  const activeAttachment =
    imageAttachment ??
    (imageUrl.trim()
      ? {
          label: "Externe Bild-URL",
          origin: "remote-url" as const,
          previewUrl: imageUrl.trim(),
          url: imageUrl.trim()
        }
      : null)
  const requiresImage = taskType === "vision-detect"
  const isSubmitDisabled = isSubmitting || isPending || isReadingImage || (requiresImage && !activeAttachment)

  function applyQuickAction(action: QuickAction) {
    setTaskType(action.taskType)
    setCommand(`${action.prompt} Bezug: ${room?.name ?? space.name}.`)
  }

  async function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      return
    }

    if (!acceptedImageTypes.has(file.type)) {
      setError("Bitte waehle ein JPEG-, PNG- oder WebP-Bild.")
      return
    }

    if (file.size > maxImageBytes) {
      setError("Bilder duerfen hoechstens 8 MB gross sein.")
      return
    }

    setIsReadingImage(true)
    setError(null)

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setImageUrl("")
      setImageAttachment({
        label: file.name,
        origin: "inline-upload",
        previewUrl: dataUrl,
        url: dataUrl
      })
    } catch {
      setImageAttachment(null)
      setError("Das Bild konnte nicht gelesen werden.")
    } finally {
      setIsReadingImage(false)
    }
  }

  function handleImageUrlChange(nextValue: string) {
    setImageUrl(nextValue)
    setImageAttachment(null)
    if (error) {
      setError(null)
    }
  }

  function clearAttachment() {
    setImageAttachment(null)
    setImageUrl("")
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    void (async () => {
      try {
        const response = await fetch(`${getBrowserApiBaseUrl()}/ai/tasks`, {
          body: JSON.stringify({
            input: {
              attachments: activeAttachment
                ? [
                    {
                      kind: "image",
                      label: activeAttachment.label,
                      url: activeAttachment.url
                    }
                  ]
                : [],
              context: {
                mode: "immersive-shell"
              },
              prompt: command,
              projectId: space.projectId,
              roomId: room?.id,
              spaceId: space.id
            },
            taskType
          }),
          headers: {
            "Content-Type": "application/json"
          },
          method: "POST"
        })

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { detail?: string } | null
          throw new Error(payload?.detail ?? "Der KI-Dienst ist momentan nicht erreichbar.")
        }

        const payload = (await response.json()) as AIResponse
        startTransition(() => {
          setResult(payload)
        })
      } catch (caughtError) {
        const message =
          caughtError instanceof Error ? caughtError.message : "Die Analyse konnte nicht gestartet werden."
        startTransition(() => {
          setError(message)
          setResult(null)
        })
      } finally {
        setIsSubmitting(false)
      }
    })()
  }

  return (
    <section aria-label="KI-Befehlsebene" className="command-bar">
      <div className="command-bar__header">
        <div>
          <p className="eyebrow">KI-Befehlsebene</p>
          <h2>Suchen, steuern, deuten</h2>
        </div>
        <div className="command-bar__status">
          <span className="command-bar__status-dot" aria-hidden="true" />
          <span>MiniMax zuerst</span>
          <span className="command-bar__kbd">/</span>
        </div>
      </div>

      <div className="command-bar__switches" role="tablist" aria-label="Analysearten">
        {quickActions.map((action) => {
          const active = taskType === action.taskType
          return (
            <button
              aria-selected={active}
              className={`command-switch${active ? " command-switch--active" : ""}`}
              key={action.taskType}
              onClick={() => applyQuickAction(action)}
              role="tab"
              type="button"
            >
              {action.label}
            </button>
          )
        })}
      </div>

      <form className="command-bar__form" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="command-bar-input">
          KI-Befehl eingeben
        </label>
        <input
          autoComplete="off"
          aria-describedby="command-bar-help"
          enterKeyHint="go"
          id="command-bar-input"
          name="command"
          onChange={(event) => setCommand(event.target.value)}
          placeholder="Zum Beispiel: Zeige mir alle priorisierten Objekte im Salon…"
          spellCheck={false}
          type="text"
          value={command}
        />

        {requiresImage ? (
          <div className="command-bar__attachment-stack">
            <div className="command-bar__attachment-controls">
              <label className="button button--secondary command-bar__upload">
                <input
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="sr-only"
                  onChange={handleImageSelection}
                  type="file"
                />
                {isReadingImage ? "Bild wird geladen…" : "Bild waehlen"}
              </label>
              <span className="command-bar__attachment-divider" aria-hidden="true">
                oder
              </span>
              <label className="sr-only" htmlFor="command-bar-image-url">
                Bild-URL
              </label>
              <input
                autoComplete="off"
                id="command-bar-image-url"
                inputMode="url"
                onChange={(event) => handleImageUrlChange(event.target.value)}
                placeholder="https://… oder Upload vom Geraet"
                spellCheck={false}
                type="url"
                value={imageUrl}
              />
            </div>

            {activeAttachment ? (
              <div className="command-bar__attachment-card">
                <div className="command-bar__attachment-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="Vorschau des Analysebilds"
                    src={activeAttachment.previewUrl}
                  />
                </div>
                <div className="command-bar__attachment-meta">
                  <strong>{truncateAttachmentLabel(activeAttachment.label)}</strong>
                  <span>
                    {activeAttachment.origin === "inline-upload"
                      ? "Direkt vom Geraet"
                      : "Externe Bildquelle"}
                  </span>
                </div>
                <button
                  className="button button--secondary command-bar__attachment-remove"
                  onClick={clearAttachment}
                  type="button"
                >
                  Entfernen
                </button>
              </div>
            ) : (
              <p className="command-bar__attachment-note">
                Fuer die visuelle Analyse wird mindestens ein Bild benoetigt.
              </p>
            )}
          </div>
        ) : null}

        <div className="command-bar__footer">
          <span className="command-bar__help" id="command-bar-help">
            {requiresImage
              ? "Aufgabe waehlen, Bild anhaengen und dann Analyse starten."
              : "Aufgabe waehlen, Prompt verfeinern, dann Analyse starten."}
          </span>
          <button
            className="button button--primary command-bar__submit"
            disabled={isSubmitDisabled}
            type="submit"
          >
            {isSubmitting || isPending ? "Analysiere…" : "Analyse starten"}
          </button>
        </div>
      </form>

      <p className="command-bar__preview">
        Vorschau: <span>{deferredCommand}</span>
      </p>

      {result || error ? (
        <div className="command-brief" aria-live="polite">
          <div className="command-brief__header">
            <strong>Routenstatus</strong>
            <span>{result?.provider.providerId ?? "MiniMax bevorzugt"}</span>
          </div>
          {error ? <p className="command-brief__error">{error}</p> : null}
          {result ? (
            <>
              <p>{result.output.summary}</p>
              <ul className="command-brief__facts">
                <li>Provider: {result.provider.providerId}</li>
                <li>Konfiguriert: {result.provider.configured ? "Ja" : "Nein"}</li>
                <li>Task: {result.taskType}</li>
              </ul>
              {result.output.warnings.length ? (
                <ul className="command-brief__warnings">
                  {result.output.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}
        </div>
      ) : (
        <p className="command-note">
          Schluessel bleiben serverseitig. Die Konsole startet nur orchestrierte, pruefbare
          Analysejobs.
        </p>
      )}
    </section>
  )
}

function truncateAttachmentLabel(label: string) {
  return label.length > 48 ? `${label.slice(0, 45)}…` : label
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("file-read-failed"))
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("file-read-failed"))
        return
      }

      resolve(reader.result)
    }
    reader.readAsDataURL(file)
  })
}
