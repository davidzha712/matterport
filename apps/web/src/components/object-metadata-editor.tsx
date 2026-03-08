"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { getBrowserApiBaseUrl } from "@/lib/browser-api"
import type { ObjectRecord } from "@/lib/platform-types"
import { Eyebrow } from "@/components/gallery"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type ObjectMetadataEditorProps = {
  objectRecord: ObjectRecord
  spaceId: string
}

type WorkflowUpdateResponse = {
  objectRecord: ObjectRecord
}

export function ObjectMetadataEditor({ objectRecord, spaceId }: ObjectMetadataEditorProps) {
  const router = useRouter()
  const [draft, setDraft] = useState({
    aiSummary: objectRecord.aiSummary,
    disposition: objectRecord.disposition,
    note: "",
    status: objectRecord.status,
    title: objectRecord.title,
    type: objectRecord.type
  })
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isPending, startTransition] = useTransition()

  function updateField<Key extends keyof typeof draft>(key: Key, value: (typeof draft)[Key]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function handleSave() {
    setError(null)
    setFeedback(null)
    setIsSaving(true)

    try {
      const response = await fetch(`${getBrowserApiBaseUrl()}/spaces/${spaceId}/objects/${objectRecord.id}`, {
        body: JSON.stringify({
          aiSummary: draft.aiSummary,
          disposition: draft.disposition,
          note: draft.note || undefined,
          reviewer: "object-detail-editor",
          status: draft.status,
          title: draft.title,
          type: draft.type
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "PATCH"
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null
        throw new Error(payload?.detail ?? "Objektdaten konnten nicht gespeichert werden.")
      }

      const payload = (await response.json()) as WorkflowUpdateResponse
      setDraft((current) => ({
        ...current,
        aiSummary: payload.objectRecord.aiSummary,
        disposition: payload.objectRecord.disposition,
        note: "",
        status: payload.objectRecord.status,
        title: payload.objectRecord.title,
        type: payload.objectRecord.type
      }))
      setFeedback("Objektdossier gespeichert und in den Workflow zurückgeschrieben.")
      window.dispatchEvent(new CustomEvent("workflow-updated", { detail: { spaceId } }))
      startTransition(() => {
        router.refresh()
      })
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Objektdaten konnten nicht gespeichert werden."
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <Eyebrow>Control Room</Eyebrow>
        <CardTitle>Objekt manuell nachschärfen</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Titel</span>
            <Input
              onChange={(event) => updateField("title", event.target.value)}
              type="text"
              value={draft.title}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Typ</span>
            <Input
              onChange={(event) => updateField("type", event.target.value)}
              type="text"
              value={draft.type}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Status</span>
            <select
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              onChange={(event) => updateField("status", event.target.value as ObjectRecord["status"])}
              value={draft.status}
            >
              <option value="Needs Review">Needs Review</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Approved">Approved</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Disposition</span>
            <select
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              onChange={(event) => updateField("disposition", event.target.value as ObjectRecord["disposition"])}
              value={draft.disposition}
            >
              <option value="Keep">Keep</option>
              <option value="Sell">Sell</option>
              <option value="Donate">Donate</option>
              <option value="Archive">Archive</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs text-muted-foreground">Kuratorische / operative Zusammenfassung</span>
            <Textarea
              onChange={(event) => updateField("aiSummary", event.target.value)}
              rows={6}
              value={draft.aiSummary}
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs text-muted-foreground">Audit-Notiz</span>
            <Input
              onChange={(event) => updateField("note", event.target.value)}
              placeholder="Warum wurde das Dossier geändert?"
              type="text"
              value={draft.note}
            />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button
            disabled={isSaving || isPending}
            onClick={() => void handleSave()}
          >
            {isSaving || isPending ? "Speichere\u2026" : "Dossier speichern"}
          </Button>
          {feedback ? <p className="text-sm text-[var(--success)]">{feedback}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}
