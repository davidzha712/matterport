"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { getBrowserApiBaseUrl } from "@/lib/browser-api"
import type { ObjectRecord } from "@/lib/platform-types"
import { Eyebrow } from "@/components/gallery"
import { useT } from "@/lib/i18n"
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

async function patchLocalObject(
  updates: { id: string } & Partial<ObjectRecord>,
): Promise<ObjectRecord> {
  const response = await fetch("/api/objects", {
    body: JSON.stringify(updates),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null
    throw new Error(payload?.detail ?? "Local save failed")
  }

  const payload = (await response.json()) as { object: ObjectRecord }
  return payload.object
}

export function ObjectMetadataEditor({ objectRecord, spaceId }: ObjectMetadataEditorProps) {
  const router = useRouter()
  const t = useT()
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
        if (response.status === 404) {
          const updatedLocalObject = await patchLocalObject({
            aiSummary: draft.aiSummary,
            disposition: draft.disposition,
            id: objectRecord.id,
            spaceId,
            status: draft.status,
            title: draft.title,
            type: draft.type,
          })
          setDraft((current) => ({
            ...current,
            aiSummary: updatedLocalObject.aiSummary,
            disposition: updatedLocalObject.disposition,
            note: "",
            status: updatedLocalObject.status,
            title: updatedLocalObject.title,
            type: updatedLocalObject.type,
          }))
          setFeedback(t.objects.saved)
          window.dispatchEvent(new CustomEvent("workflow-updated", { detail: { spaceId } }))
          window.dispatchEvent(new CustomEvent("objects-updated"))
          startTransition(() => {
            router.refresh()
          })
          return
        }

        const payload = (await response.json().catch(() => null)) as { detail?: string } | null
        throw new Error(payload?.detail ?? t.objects.saveFailed)
      }

      const payload = (await response.json()) as WorkflowUpdateResponse
      await patchLocalObject({
        aiSummary: payload.objectRecord.aiSummary,
        disposition: payload.objectRecord.disposition,
        id: objectRecord.id,
        spaceId,
        status: payload.objectRecord.status,
        title: payload.objectRecord.title,
        type: payload.objectRecord.type,
      })
      setDraft((current) => ({
        ...current,
        aiSummary: payload.objectRecord.aiSummary,
        disposition: payload.objectRecord.disposition,
        note: "",
        status: payload.objectRecord.status,
        title: payload.objectRecord.title,
        type: payload.objectRecord.type
      }))
      setFeedback(t.objects.saved)
      window.dispatchEvent(new CustomEvent("workflow-updated", { detail: { spaceId } }))
      window.dispatchEvent(new CustomEvent("objects-updated"))
      startTransition(() => {
        router.refresh()
      })
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : t.objects.saveFailed
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <Eyebrow>{t.objects.controlRoom}</Eyebrow>
        <CardTitle>{t.objects.sharpenManually}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{t.objects.titleField}</span>
            <Input
              onChange={(event) => updateField("title", event.target.value)}
              type="text"
              value={draft.title}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{t.objects.type}</span>
            <Input
              onChange={(event) => updateField("type", event.target.value)}
              type="text"
              value={draft.type}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{t.common.status}</span>
            <select
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              onChange={(event) => updateField("status", event.target.value as ObjectRecord["status"])}
              value={draft.status}
            >
              <option value="Needs Review">{t.workflow.needsReview}</option>
              <option value="Reviewed">{t.workflow.reviewed}</option>
              <option value="Approved">{t.workflow.approved}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{t.objects.disposition}</span>
            <select
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              onChange={(event) => updateField("disposition", event.target.value as ObjectRecord["disposition"])}
              value={draft.disposition}
            >
              <option value="Keep">{t.workflow.keep}</option>
              <option value="Sell">{t.workflow.sell}</option>
              <option value="Donate">{t.workflow.donate}</option>
              <option value="Archive">{t.workflow.archive}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs text-muted-foreground">{t.objects.operativeSummary}</span>
            <Textarea
              onChange={(event) => updateField("aiSummary", event.target.value)}
              rows={6}
              value={draft.aiSummary}
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs text-muted-foreground">{t.objects.auditNoteField}</span>
            <Input
              onChange={(event) => updateField("note", event.target.value)}
              placeholder={t.objects.auditNotePlaceholder}
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
            {isSaving || isPending ? t.objects.saving : t.objects.saveDossier}
          </Button>
          {feedback ? <p className="text-sm text-[var(--success)]">{feedback}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}
