"use client"

import type { FormEvent } from "react"
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
    structuredData: Record<string, string | number | null | string[] | undefined>
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

export function CommandBar({ room, space }: CommandBarProps) {
  const [taskType, setTaskType] = useState<TaskType>("vision-detect")
  const [command, setCommand] = useState(
    `Erkenne die wichtigsten Objekte in ${room?.name ?? space.name} und gruppiere sie fuer die Pruefung.`
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<AIResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const deferredCommand = useDeferredValue(command)

  function applyQuickAction(action: QuickAction) {
    setTaskType(action.taskType)
    setCommand(`${action.prompt} Bezug: ${room?.name ?? space.name}.`)
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
              context: {
                mode: "immersive-shell",
                projectId: space.projectId
              },
              prompt: command,
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

        <div className="command-bar__footer">
          <span className="command-bar__help" id="command-bar-help">
            Aufgabe waehlen, Prompt verfeinern, dann Analyse starten.
          </span>
          <button
            className="button button--primary command-bar__submit"
            disabled={isSubmitting || isPending}
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
