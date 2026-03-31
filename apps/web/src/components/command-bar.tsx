"use client"

import type { ChangeEvent, FormEvent } from "react"
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useBridge } from "@/lib/bridge-context"
import { useLocale } from "@/lib/i18n"
import { useVoiceCommands } from "@/lib/use-voice-commands"
import { useVoiceInput } from "@/lib/use-voice-input"
import type { CameraPose } from "@/lib/matterport-bridge"
import type { RoomRecord, SpaceRecord } from "@/lib/platform-types"

type TaskType = "vision-detect" | "narrative-summarize" | "workflow-assist"

type CommandBarProps = {
  room?: RoomRecord
  space: SpaceRecord
}

type AIResponse = {
  output: {
    structuredData: Record<string, unknown>
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

type ProgressStep = {
  step: string
  progress: number
}

const STEP_KEYS: Record<string, "stepInit" | "stepSearch" | "stepVlm" | "stepParse" | "stepPlacing" | "stepDone" | "stepError"> = {
  init: "stepInit",
  search: "stepSearch",
  vlm: "stepVlm",
  parse: "stepParse",
  placing: "stepPlacing",
  done: "stepDone",
  error: "stepError",
}

const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"])
const maxImageBytes = 8 * 1024 * 1024

export function CommandBar({ room, space }: CommandBarProps) {
  const { locale, t } = useLocale()
  const { bridge } = useBridge()
  const { executeCommand } = useVoiceCommands(bridge, space)
  const [taskType, setTaskType] = useState<TaskType>("vision-detect")
  const [command, setCommand] = useState("")
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null)

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      // Try to parse as a spatial command first
      void executeCommand(text).then((result) => {
        if (result.handled) {
          setVoiceFeedback(result.feedback)
          setTimeout(() => setVoiceFeedback(null), 3000)
        } else {
          // Not a command — fill into the search box for AI analysis
          setCommand((prev) => (prev ? `${prev} ${text}` : text))
        }
      })
    },
    [executeCommand]
  )
  const voice = useVoiceInput(handleVoiceTranscript, { locale })
  const [screenshotPose, setScreenshotPose] = useState<CameraPose | null>(null)
  const [imageUrl, setImageUrl] = useState("")
  const [imageAttachment, setImageAttachment] = useState<ImageAttachmentState | null>(null)
  const [isReadingImage, setIsReadingImage] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState<ProgressStep | null>(null)
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
      const detail = (event as CustomEvent<{ dataUrl: string; pose?: CameraPose | null }>).detail
      if (!detail?.dataUrl) return
      setImageAttachment({
        label: t.ai.sdkScreenshot,
        origin: "sdk-capture",
        previewUrl: detail.dataUrl,
        url: detail.dataUrl
      })
      setScreenshotPose(detail.pose ?? null)
      setImageUrl("")
      if (taskType !== "vision-detect") {
        setTaskType("vision-detect")
      }
    }

    window.addEventListener("matterport-screenshot", onScreenshot)
    return () => window.removeEventListener("matterport-screenshot", onScreenshot)
  }, [taskType, t])

  // Listen for auto-vision-analyze event (V key in immersive mode)
  const formRef = useRef<HTMLFormElement>(null)
  const submittingRef = useRef(false)
  useEffect(() => {
    function onAutoAnalyze() {
      // Skip if already submitting — prevents duplicate analysis from rapid V presses
      if (submittingRef.current) return
      formRef.current?.requestSubmit()
    }

    window.addEventListener("auto-vision-analyze", onAutoAnalyze)
    return () => window.removeEventListener("auto-vision-analyze", onAutoAnalyze)
  }, [])

  const activeAttachment = useMemo(
    () =>
      imageAttachment ??
      (imageUrl.trim()
        ? {
            label: t.ai.externalImageUrl,
            origin: "remote-url" as const,
            previewUrl: imageUrl.trim(),
            url: imageUrl.trim()
          }
        : null),
    [imageAttachment, imageUrl, t.ai.externalImageUrl]
  )
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
      setError(t.ai.imageTypeError)
      return
    }

    if (file.size > maxImageBytes) {
      setError(t.ai.imageSizeError)
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
      setError(t.ai.imageReadError)
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
      if (submittingRef.current) return
      submittingRef.current = true
      setError(null)
      setIsSubmitting(true)

      // Helper: set local progress AND dispatch to floating overlay
      function emitProgress(data: ProgressStep | null) {
        setProgress(data)
        // Defer dispatch so it doesn't trigger setState in another component during render
        queueMicrotask(() => {
          window.dispatchEvent(
            new CustomEvent("ai-analysis-progress", { detail: data })
          )
        })
      }

      emitProgress({ step: "search", progress: 5 })

      // Capture camera pose NOW (submit time) as fallback if no screenshot pose
      const submitPose = screenshotPose ?? bridge.getCameraPose()

      void (async () => {
        try {
          const requestBody = {
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
          }

          const response = await fetch("/api/ai/vision", {
            body: JSON.stringify(requestBody),
            headers: { "Content-Type": "application/json" },
            method: "POST"
          })

          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { detail?: string } | null
            throw new Error(payload?.detail ?? t.ai.serviceUnavailable)
          }

          // Read SSE stream for real-time progress
          let finalResult: AIResponse | null = null
          const reader = response.body?.getReader()

          if (reader) {
            // Start a simulated progress ticker that advances while waiting
            // for real SSE events (handles buffered/chunked delivery)
            let simulatedProgress = 5
            const ticker = setInterval(() => {
              simulatedProgress = Math.min(simulatedProgress + 3, 90)
              setProgress((prev) => {
                if (!prev || prev.progress >= simulatedProgress) return prev
                return { ...prev, progress: simulatedProgress }
              })
              // Dispatch outside updater to avoid cross-component setState during render
              queueMicrotask(() => {
                window.dispatchEvent(
                  new CustomEvent("ai-analysis-progress", {
                    detail: { step: "vlm", progress: simulatedProgress },
                  })
                )
              })
            }, 800)

            try {
              const decoder = new TextDecoder()
              let buffer = ""

              for (;;) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const parts = buffer.split("\n\n")
                buffer = parts.pop() ?? ""

                for (const part of parts) {
                  for (const line of part.split("\n")) {
                    if (!line.startsWith("data: ")) continue
                    try {
                      const evt = JSON.parse(line.slice(6)) as {
                        step: string
                        progress?: number
                        message?: string
                        result?: AIResponse
                      }

                      if (evt.step === "error") {
                        throw new Error(evt.message ?? t.ai.analysisError)
                      }

                      const realProgress = evt.progress ?? 0
                      simulatedProgress = Math.max(simulatedProgress, realProgress)
                      emitProgress({ step: evt.step, progress: realProgress })

                      if (evt.step === "done" && evt.result) {
                        finalResult = evt.result
                      }
                    } catch (parseErr) {
                      if (parseErr instanceof SyntaxError) continue
                      throw parseErr
                    }
                  }
                }
              }
            } finally {
              clearInterval(ticker)
            }
          }

          if (!finalResult) throw new Error(t.ai.analysisError)

          // If AI detected objects, dispatch a single batch event for 3D tag creation
          if (finalResult.taskType === "vision-detect" && finalResult.output.structuredData) {
            emitProgress({ step: "placing", progress: 95 })
            const detected = finalResult.output.structuredData
            if (Array.isArray(detected.objects) && detected.objects.length > 0) {
              const items = (detected.objects as Array<{
                label?: string
                description?: string
                bbox?: [number, number, number, number] | null
                color?: { r: number; g: number; b: number }
                confidence?: number
                category?: string
              }>).filter((o) => o.label)

              window.dispatchEvent(
                new CustomEvent("annotations-from-ai", {
                  detail: {
                    captureDataUrl:
                      activeAttachment?.origin === "sdk-capture"
                        ? activeAttachment.url
                        : undefined,
                    items,
                    screenshotPose: submitPose,
                    spaceId: space.id,
                    roomId: room?.id ?? "",
                    roomName: room?.name ?? "",
                  }
                })
              )
            }
          }

          startTransition(() => {
            setResult(finalResult)
            emitProgress(null)
          })
        } catch (caughtError) {
          const message =
            caughtError instanceof Error ? caughtError.message : t.ai.analysisError
          startTransition(() => {
            setError(message)
            setResult(null)
            emitProgress(null)
          })
        } finally {
          submittingRef.current = false
          setIsSubmitting(false)
        }
      })()
    },
    [activeAttachment, bridge, command, room, screenshotPose, space, taskType, t]
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

      <form className="command-bar__form" onSubmit={handleSubmit} ref={formRef}>
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

        <div className="command-bar__voice-row">
          <button
            className={`command-bar__voice-btn${voice.isRecording ? " command-bar__voice-btn--recording" : ""}`}
            disabled={voice.isTranscribing}
            onClick={voice.toggleRecording}
            title={voice.isRecording ? t.commandBar.stop : t.commandBar.voiceInputTitle}
            type="button"
          >
            <span className="command-bar__voice-icon" aria-hidden="true">
              {voice.isRecording ? "■" : "●"}
            </span>
            {voice.isRecording
              ? t.commandBar.stop
              : voice.isTranscribing
                ? t.common.loading
                : t.commandBar.voice}
          </button>
          {voice.error ? (
            <span className="command-bar__voice-error">{voice.error}</span>
          ) : null}
          {voiceFeedback ? (
            <span className="command-bar__voice-feedback" aria-live="polite">
              {voiceFeedback}
            </span>
          ) : null}
        </div>

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
                {t.ai.orDivider}
              </span>
              <label className="sr-only" htmlFor="command-bar-image-url">
                URL
              </label>
              <input
                autoComplete="off"
                id="command-bar-image-url"
                inputMode="url"
                onChange={(event) => handleImageUrlChange(event.target.value)}
                placeholder={t.ai.urlPlaceholder}
                spellCheck={false}
                type="url"
                value={imageUrl}
              />
            </div>

            {activeAttachment ? (
              <div className="command-bar__attachment-card">
                <div className="command-bar__attachment-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={t.commandBar.imagePreview} src={activeAttachment.previewUrl} />
                </div>
                <div className="command-bar__attachment-meta">
                  <strong>{truncateLabel(activeAttachment.label)}</strong>
                  <span>
                    {activeAttachment.origin === "sdk-capture"
                      ? t.ai.sdkScreenshot
                      : activeAttachment.origin === "inline-upload"
                        ? t.ai.uploadLabel
                        : t.ai.urlLabel}
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
                {t.ai.imageRequired}
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

      {progress ? (
        <div className="command-bar__progress" aria-live="polite">
          <div className="command-bar__progress-bar">
            <div
              className="command-bar__progress-fill"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <div className="command-bar__progress-info">
            <span className="command-bar__progress-step">
              {STEP_KEYS[progress.step] ? t.commandBar[STEP_KEYS[progress.step]] : progress.step}
            </span>
            <span className="command-bar__progress-pct">{progress.progress}%</span>
          </div>
        </div>
      ) : (
        <p className="command-bar__preview">
          {deferredCommand}
        </p>
      )}

      {result || error ? (
        <div className="command-brief" aria-live="polite">
          <div className="command-brief__header">
            <strong>{t.ai.resultsReady}</strong>
            <span>{result?.provider.providerId ?? "MiniMax"}</span>
          </div>
          {error ? <p className="command-brief__error">{error}</p> : null}
          {result ? (
            <>
              {result.taskType === "vision-detect" && Array.isArray(result.output.structuredData?.objects) && result.output.structuredData.objects.length > 0 ? (
                <div className="command-brief__objects">
                  <strong>{result.output.structuredData.objects.length} {t.commandBar.objectsDetected}</strong>
                  <ul>
                    {(result.output.structuredData.objects as Array<{label: string; category?: string; confidence?: number}>).map((obj, i) => (
                      <li key={`${obj.label}-${i}`}>
                        <span>{obj.label}</span>
                        {obj.confidence != null ? (
                          <span className="command-brief__confidence">{Math.round(obj.confidence * 100)}%</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p>{result.output.summary}</p>
              )}
              <ul className="command-brief__facts">
                <li>{t.commandBar.providerLabel}: {result.provider.providerId}</li>
                <li>{t.providers.connected}: {result.provider.configured ? t.common.success : t.common.error}</li>
                <li>{t.commandBar.taskLabel}: {result.taskType}</li>
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
