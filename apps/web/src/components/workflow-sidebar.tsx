"use client"

import { useEffect, useState } from "react"
import { getBrowserApiBaseUrl } from "@/lib/browser-api"
import type { ProviderProfile } from "@/lib/mock-data"
import { toDisplayDisposition, toDisplayObjectStatus, toDisplayPriority } from "@/lib/presentation"

type ReviewQueueItem = {
  disposition: "Keep" | "Sell" | "Donate" | "Archive"
  objectId: string
  objectTitle: string
  priorityBand: "High" | "Medium" | "Low"
  roomName: string
  status: "Reviewed" | "Needs Review" | "Approved"
}

type AuditEvent = {
  after: {
    disposition: ReviewQueueItem["disposition"]
    status: ReviewQueueItem["status"]
  }
  before: {
    disposition: ReviewQueueItem["disposition"]
    status: ReviewQueueItem["status"]
  }
  id: string
  note?: string | null
  objectTitle: string
  reviewer: string
}

export function WorkflowSidebar({
  providers,
  spaceId,
}: {
  providers: ProviderProfile[]
  spaceId: string
}) {
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([])
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setError(null)
        const [queueResponse, auditResponse] = await Promise.all([
          fetch(`${getBrowserApiBaseUrl()}/workflows/review-queue?spaceId=${spaceId}`),
          fetch(`${getBrowserApiBaseUrl()}/workflows/audit-log?spaceId=${spaceId}`),
        ])

        if (!queueResponse.ok || !auditResponse.ok) {
          throw new Error("Workflow-Daten konnten nicht geladen werden.")
        }

        const queuePayload = (await queueResponse.json()) as { items: ReviewQueueItem[] }
        const auditPayload = (await auditResponse.json()) as { items: AuditEvent[] }
        setReviewQueue(queuePayload.items)
        setAuditLog(auditPayload.items)
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Workflow-Daten konnten nicht geladen werden."
        )
      }
    }

    void load()
    const onWorkflowUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ spaceId?: string }>).detail
      if (detail?.spaceId === spaceId) {
        void load()
      }
    }
    window.addEventListener("workflow-updated", onWorkflowUpdated as EventListener)
    return () => {
      window.removeEventListener("workflow-updated", onWorkflowUpdated as EventListener)
    }
  }, [spaceId])

  const activeProviders = providers.filter((provider) => provider.configured)

  return (
    <>
      <section className="context-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Review Queue</p>
            <h2>Offene Entscheidungen</h2>
          </div>
          <span className="pill pill--active">{reviewQueue.length} offen</span>
        </div>
        {error ? (
          <p className="workflow-feedback workflow-feedback--error">{error}</p>
        ) : reviewQueue.length ? (
          <ul className="workflow-list">
            {reviewQueue.map((item) => (
              <li className="workflow-list__item" key={item.objectId}>
                <div>
                  <strong>{item.objectTitle}</strong>
                  <p>{item.roomName}</p>
                </div>
                <div className="workflow-list__meta">
                  <span>{toDisplayPriority(item.priorityBand)}</span>
                  <small>
                    {toDisplayDisposition(item.disposition)} · {toDisplayObjectStatus(item.status)}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>Im aktuellen Space ist keine offene Pruefung mehr vorhanden.</p>
        )}
      </section>

      <section className="context-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Workflow-Status</p>
            <h2>Pruefregeln</h2>
          </div>
        </div>
        <ul className="context-list">
          <li>
            {activeProviders.length > 0
              ? `Aktiv geroutet: ${activeProviders.map((provider) => provider.label).join(", ")}.`
              : "Noch kein Provider aktiv verbunden."}
          </li>
          <li>KI-Ausgaben bleiben bis zur menschlichen Pruefung unverbindlich.</li>
          <li>Verkauf, Spende, Archiv und Export brauchen Freigaben.</li>
          <li>Provider-Keys liegen nur im Backend und sind projektgebunden.</li>
        </ul>
      </section>

      <section className="context-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Audit Trail</p>
            <h2>Letzte Aenderungen</h2>
          </div>
        </div>
        {auditLog.length ? (
          <ul className="workflow-list workflow-list--audit">
            {auditLog.slice(0, 4).map((event) => (
              <li className="workflow-list__item" key={event.id}>
                <div>
                  <strong>{event.objectTitle}</strong>
                  <p>{event.reviewer}</p>
                </div>
                <div className="workflow-list__meta">
                  <span>
                    {toDisplayDisposition(event.before.disposition)} →{" "}
                    {toDisplayDisposition(event.after.disposition)}
                  </span>
                  <small>{event.note || "Keine Zusatznotiz."}</small>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>Noch keine verzeichneten Aenderungen in diesem Space.</p>
        )}
      </section>
    </>
  )
}
