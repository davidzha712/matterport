"use client"

import type { ChangeEvent, FormEvent } from "react"
import { useCallback, useDeferredValue, useEffect, useState, useTransition } from "react"
import { getBrowserApiBaseUrl } from "@/lib/browser-api"
import { useT } from "@/lib/i18n"
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

type ImageAttachmentState = {
  label: string
  origin: "inline-upload" | "remote-url" | "sdk-capture"
  previewUrl: string
  url: string
}

const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"])
const maxImageBytes = 8 * 1024 * 1024

export function CommandBar({ room, space }: CommandBarProps) {
  const t = useT()
  const [taskType, setTaskType] = useState<TaskType>("vision-detect")
  const [command, setCommand] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [imageAttachment, setImageAttachment] = useState<ImageAttachmentState | null>(null)
  const [isReadingImage, setIsReadingImage] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<AIResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const deferredCommand = useDeferredValue(command)

  const quickActions = [
    {
      label: t.ai.detectObjects,
      prompt: `${t.ai.detectObjects}: ${room?.name ?? space.name}`,
      taskType: "vision-detect" as TaskType
    },
    {
      label: t.ai.narrateRoom,
      prompt: `${t.ai.narrateRoom}: ${room?.name ?? space.name}`,
      taskType: "narrative-summarize" as TaskType
    },
    {
      label: t.ai.planWorkflow,
      prompt: `${t.ai.planWorkflow}: ${room?.name ?? space.name}`,
      taskType: "workflow-assist" as TaskType
    }
  ]

  // Set initial command
  useEffect(() => {
    setCommand(`${t.ai.detectObjects}: ${room?.name ?? space.name}`)
  }, [t, room, space])

  // Listen for SDK screenshots
  useEffect(() => {
    function onScreenshot(event: Event) {
      const detail = (event as CustomEvent<{ dataUrl: string }>).detail
      if (!detail?.dataUrl) return
      setImageAttachment({
        label: "SDK Screenshot",
        origin: "sdk-capture",
        previewUrl: detail.dataUrl,
        url: detail.dataUrl
      })
      setImageUrl("")
      if (taskType !== "vision-detect") {
        setTaskType("vision-detect")
      }
    }

    window.addEventListener("matterport-screenshot", onScreenshot)
    return () => window.removeEventListener("matterport-screenshot", onScreenshot)
  }, [taskType])

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

  function applyQuickAction(action: (typeof quickActions)[number]) {
    setTaskType(action.taskType)
    setCommand(action.prompt)
  }

  async function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) return

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
    if (error) setError(null)
  }

  function clearAttachment() {
    setImageAttachment(null)
    setImageUrl("")
  }

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setError(null)
      setIsSubmitting(true)

      void (async () => {
        try {
          const response = await fetch(`${getBrowserApiBaseUrl()}/ai/tasks`, {
            body: JSON.stringify({
              input: {
                attachments: activeAttachment
                  ? [{ kind: "image", label: activeAttachment.label, url: activeAttachment.url }]
                  : [],
                context: { mode: "immersive-shell" },
                prompt: command,
                projectId: space.projectId,
                roomId: room?.id,
                spaceId: space.id
              },
              taskType
            }),
            headers: { "Content-Type": "application/json" },
            method: "POST"
          })

          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { detail?: string } | null
            throw new Error(payload?.detail ?? "Der KI-Dienst ist momentan nicht erreichbar.")
          }

          const payload = (await response.json()) as AIResponse

          // If AI detected objects, dispatch events for 3D tag creation
          if (payload.taskType === "vision-detect" && payload.output.structuredData) {
            const detected = payload.output.structuredData
            if (Array.isArray(detected.objects)) {
              for (const obj of detected.objects) {
                if (typeof obj === "string") {
                  window.dispatchEvent(
                    new CustomEvent("annotation-from-ai", {
                      detail: { label: obj, description: payload.output.summary }
                    })
                  )
                }
              }
            }
          }

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
    },
    [activeAttachment, command, room, space, taskType]
  )

  return (
    <section aria-label={t.ai.detectObjects} className="command-bar">
      <div className="command-bar__header">
        <div>
          <p className="eyebrow">{t.ai.detectObjects}</p>
          <h2>{t.common.search}</h2>
        </div>
        <div className="command-bar__status">
          <span className="command-bar__status-dot" aria-hidden="true" />
          <span>MiniMax</span>
          <span className="command-bar__kbd">/</span>
        </div>
      </div>

      <div className="command-bar__switches" role="tablist" aria-label={t.ai.detectObjects}>
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
          {t.common.search}
        </label>
        <input
          autoComplete="off"
          aria-describedby="command-bar-help"
          enterKeyHint="go"
          id="command-bar-input"
          name="command"
          onChange={(event) => setCommand(event.target.value)}
          placeholder={t.common.search}
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
                  onChange={(e) => void handleImageSelection(e)}
                  type="file"
                />
                {isReadingImage ? t.common.loading : t.common.add}
              </label>
              <span className="command-bar__attachment-divider" aria-hidden="true">
                oder
              </span>
              <label className="sr-only" htmlFor="command-bar-image-url">
                URL
              </label>
              <input
                autoComplete="off"
                id="command-bar-image-url"
                inputMode="url"
                onChange={(event) => handleImageUrlChange(event.target.value)}
                placeholder="https://… oder Upload / SDK Screenshot"
                spellCheck={false}
                type="url"
                value={imageUrl}
              />
            </div>

            {activeAttachment ? (
              <div className="command-bar__attachment-card">
                <div className="command-bar__attachment-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="Preview" src={activeAttachment.previewUrl} />
                </div>
                <div className="command-bar__attachment-meta">
                  <strong>{truncateLabel(activeAttachment.label)}</strong>
                  <span>
                    {activeAttachment.origin === "sdk-capture"
                      ? "SDK Screenshot"
                      : activeAttachment.origin === "inline-upload"
                        ? "Upload"
                        : "URL"}
                  </span>
                </div>
                <button
                  className="button button--secondary command-bar__attachment-remove"
                  onClick={clearAttachment}
                  type="button"
                >
                  {t.common.delete}
                </button>
              </div>
            ) : (
              <p className="command-bar__attachment-note">
                Fuer die visuelle Analyse wird mindestens ein Bild benoetigt.
                SDK Screenshot oder Upload.
              </p>
            )}
          </div>
        ) : null}

        <div className="command-bar__footer">
          <span className="command-bar__help" id="command-bar-help">
            {t.ai.analyzing}
          </span>
          <button
            className="button button--primary command-bar__submit"
            disabled={isSubmitDisabled}
            type="submit"
          >
            {isSubmitting || isPending ? t.ai.analyzing : t.common.search}
          </button>
        </div>
      </form>

      <p className="command-bar__preview">
        {deferredCommand}
      </p>

      {result || error ? (
        <div className="command-brief" aria-live="polite">
          <div className="command-brief__header">
            <strong>{t.ai.resultsReady}</strong>
            <span>{result?.provider.providerId ?? "MiniMax"}</span>
          </div>
          {error ? <p className="command-brief__error">{error}</p> : null}
          {result ? (
            <>
              <p>{result.output.summary}</p>
              <ul className="command-brief__facts">
                <li>Provider: {result.provider.providerId}</li>
                <li>{t.providers.connected}: {result.provider.configured ? "Ja" : "Nein"}</li>
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
          {t.providers.serverSideOnly}
        </p>
      )}
    </section>
  )
}

function truncateLabel(label: string) {
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
