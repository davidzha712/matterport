"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { getBrowserApiBaseUrl } from "@/lib/browser-api"
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
  const [currentObject, setCurrentObject] = useState(objectRecord)
  const [note, setNote] = useState("")
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isSaving, setIsSaving] = useState(false)

  function updateObject(disposition: ObjectRecord["disposition"]) {
    setFeedback(null)
    setError(null)
    setIsSaving(true)

    void (async () => {
      try {
        const response = await fetch(
          `${getBrowserApiBaseUrl()}/spaces/${spaceId}/objects/${currentObject.id}`,
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
          throw new Error(payload?.detail ?? "Die Aktualisierung konnte nicht gespeichert werden.")
        }

        const payload = (await response.json()) as WorkflowUpdateResponse
        setCurrentObject(payload.objectRecord)
        setFeedback(
          `${toDisplayDisposition(payload.objectRecord.disposition)} gespeichert. ${payload.workflow.pendingReviewCount} offene Pruefungen bleiben im Space.`
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
            : "Die Aktualisierung konnte nicht gespeichert werden."
        )
      } finally {
        setIsSaving(false)
      }
    })()
  }

  return (
    <section className="context-card context-card--hero">
      <div className="context-card__tabs" aria-hidden="true">
        <span className="context-tab context-tab--active">Objektebene</span>
        <span className="context-tab">Raum</span>
        <span className="context-tab">Workflow</span>
        <span className="context-tab">Historie</span>
      </div>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Ausgewaehltes Objekt</p>
          <h2>{currentObject.title}</h2>
        </div>
        <span className={`pill pill--${toToneToken(currentObject.status)}`}>
          {toDisplayObjectStatus(currentObject.status)}
        </span>
      </div>
      <p>{currentObject.aiSummary}</p>
      <dl className="context-meta-grid">
        <div>
          <dt>Typ</dt>
          <dd>{currentObject.type}</dd>
        </div>
        <div>
          <dt>Raum</dt>
          <dd>{currentObject.roomName}</dd>
        </div>
        <div>
          <dt>Disposition</dt>
          <dd>{toDisplayDisposition(currentObject.disposition)}</dd>
        </div>
        <div>
          <dt>KI-Status</dt>
          <dd>Nur Empfehlung</dd>
        </div>
      </dl>
      <div className="knowledge-strip" aria-label="Objektschichten">
        <span>Metadaten aktiv</span>
        <span>Review-first</span>
        <span>Open Layer faehig</span>
      </div>
      <div className="asset-strip" aria-label="Dossier-Vorschau">
        <div className="asset-strip__card">Frame capture</div>
        <div className="asset-strip__card">Document scan</div>
        <div className="asset-strip__card">Voice note</div>
      </div>
      <label className="workflow-note">
        <span className="eyebrow">Audit-Notiz</span>
        <input
          autoComplete="off"
          name="workflow-note"
          onChange={(event) => setNote(event.target.value)}
          placeholder="Kurze Begruendung fuer die Aenderung…"
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
          Behalten
        </button>
        <button
          className="action-matrix__button action-matrix__button--sell"
          disabled={isPending || isSaving}
          onClick={() => updateObject("Sell")}
          type="button"
        >
          Verkaufen
        </button>
        <button
          className="action-matrix__button action-matrix__button--donate"
          disabled={isPending || isSaving}
          onClick={() => updateObject("Donate")}
          type="button"
        >
          Spenden
        </button>
        <button
          className="action-matrix__button action-matrix__button--archive"
          disabled={isPending || isSaving}
          onClick={() => updateObject("Archive")}
          type="button"
        >
          Archivieren
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
        Objektdossier oeffnen
      </Link>
    </section>
  )
}
