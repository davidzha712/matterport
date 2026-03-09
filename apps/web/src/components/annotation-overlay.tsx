"use client"

import { useCallback, useEffect, useState } from "react"
import type { ObjectCondition, SpatialAnnotation } from "@/lib/platform-types"
import { GlassPanel } from "@/components/gallery"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type AnnotationOverlayProps = {
  annotations: SpatialAnnotation[]
  bridgeStatus: "disconnected" | "iframe-only" | "sdk-connected"
  onAdd: (data: Omit<SpatialAnnotation, "id">) => void
  onRemove: (id: string) => Promise<void> | void
  onUpdate: (id: string, updates: Partial<Omit<SpatialAnnotation, "id">>) => void
}

type EditingState = {
  label: string
  description: string
  category: string
  material: string
  condition: ObjectCondition
  era: string
  valueMin: string
  valueMax: string
  valueCurrency: string
  notes: string
  posX: string
  posY: string
  posZ: string
}

const CONDITIONS: ObjectCondition[] = ["Excellent", "Good", "Fair", "Poor", "Unknown"]

const CATEGORIES = [
  "Furniture", "Painting", "Sculpture", "Textile", "Ceramic",
  "Jewelry", "Book", "Electronics", "Instrument", "Artifact", "Other",
]

function buildEditingState(annotation: SpatialAnnotation): EditingState {
  return {
    label: annotation.label,
    description: annotation.description,
    category: annotation.category ?? "",
    material: annotation.material ?? "",
    condition: annotation.condition ?? "Unknown",
    era: "",
    valueMin: annotation.estimatedValue?.min?.toString() ?? "",
    valueMax: annotation.estimatedValue?.max?.toString() ?? "",
    valueCurrency: annotation.estimatedValue?.currency ?? "EUR",
    notes: "",
    posX: String(annotation.position.x),
    posY: String(annotation.position.y),
    posZ: String(annotation.position.z),
  }
}

function buildDefaultAnnotation(): Omit<SpatialAnnotation, "id"> {
  return {
    label: "New Annotation",
    description: "",
    position: { x: 0, y: 0, z: 0 },
    createdBy: "manual",
  }
}

export function AnnotationOverlay({
  annotations,
  bridgeStatus,
  onAdd,
  onRemove,
  onUpdate,
}: AnnotationOverlayProps) {
  const [collapsed, setCollapsed] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditingState | null>(null)
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  // Track which annotations are already persisted
  useEffect(() => {
    const next = new Set<string>()
    for (const a of annotations) {
      if (a.savedToApi) next.add(a.id)
    }
    setSavedIds(next)
  }, [annotations])

  // Auto-select annotation when user clicks a 3D tag
  useEffect(() => {
    function onTagClicked(event: Event) {
      const { annotationId } = (event as CustomEvent<{ annotationId: string }>).detail
      const ann = annotations.find((a) => a.id === annotationId)
      if (ann) {
        setCollapsed(false)
        setEditingId(ann.id)
        setEditState(buildEditingState(ann))
        requestAnimationFrame(() => {
          const el = document.getElementById(`ann-${ann.id}`)
          el?.scrollIntoView({ behavior: "smooth", block: "nearest" })
        })
      }
    }
    window.addEventListener("annotation-tag-clicked", onTagClicked)
    return () => window.removeEventListener("annotation-tag-clicked", onTagClicked)
  }, [annotations])

  const startEditing = useCallback((annotation: SpatialAnnotation) => {
    setEditingId(annotation.id)
    setEditState(buildEditingState(annotation))
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingId(null)
    setEditState(null)
  }, [])

  const commitEdit = useCallback(
    (id: string) => {
      if (!editState) return
      const x = parseFloat(editState.posX)
      const y = parseFloat(editState.posY)
      const z = parseFloat(editState.posZ)
      const valMin = parseFloat(editState.valueMin)
      const valMax = parseFloat(editState.valueMax)

      const updates: Partial<Omit<SpatialAnnotation, "id">> = {
        label: editState.label,
        description: editState.description,
        category: editState.category || undefined,
        material: editState.material || undefined,
        condition: editState.condition,
        estimatedValue:
          Number.isFinite(valMin) || Number.isFinite(valMax)
            ? {
                min: Number.isFinite(valMin) ? valMin : undefined,
                max: Number.isFinite(valMax) ? valMax : undefined,
                currency: editState.valueCurrency || "EUR",
              }
            : undefined,
        position: {
          x: Number.isFinite(x) ? x : 0,
          y: Number.isFinite(y) ? y : 0,
          z: Number.isFinite(z) ? z : 0,
        },
      }

      onUpdate(id, updates)

      // Also PATCH API if annotation is persisted
      const ann = annotations.find((a) => a.id === id)
      if (ann?.objectId) {
        void fetch("/api/objects", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: ann.objectId,
            title: editState.label,
            description: editState.description,
            category: editState.category || undefined,
            material: editState.material || undefined,
            condition: editState.condition,
            era: editState.era || undefined,
            estimatedValue: updates.estimatedValue,
            position: updates.position,
          }),
        }).then(() => {
          window.dispatchEvent(new CustomEvent("objects-updated"))
        }).catch(() => {
          // Best-effort
        })
      }

      setEditingId(null)
      setEditState(null)
    },
    [annotations, editState, onUpdate]
  )

  const updateField = useCallback(
    (field: keyof EditingState, value: string) => {
      setEditState((prev) => (prev ? { ...prev, [field]: value } : prev))
    },
    []
  )

  const handleAdd = useCallback(() => {
    onAdd(buildDefaultAnnotation())
  }, [onAdd])

  const handleSaveToApi = useCallback(
    async (annotation: SpatialAnnotation) => {
      setSavingIds((prev) => new Set(prev).add(annotation.id))
      try {
        const res = await fetch("/api/objects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            object: {
              title: annotation.label,
              description: annotation.description,
              category: annotation.category,
              material: annotation.material,
              condition: annotation.condition,
              estimatedValue: annotation.estimatedValue,
              position: annotation.position,
              tagId: annotation.tagId,
              spaceId: annotation.spaceId,
              roomId: annotation.roomId,
              roomName: annotation.roomName,
              confidence: annotation.confidence,
              createdBy: annotation.createdBy,
            },
          }),
        })
        if (res.ok) {
          setSavedIds((prev) => new Set(prev).add(annotation.id))
          onUpdate(annotation.id, { savedToApi: true })
          window.dispatchEvent(new CustomEvent("objects-updated"))
        }
      } catch {
        // Best-effort
      } finally {
        setSavingIds((prev) => {
          const next = new Set(prev)
          next.delete(annotation.id)
          return next
        })
      }
    },
    [onUpdate]
  )

  const statusLabel =
    bridgeStatus === "sdk-connected"
      ? "SDK Connected"
      : bridgeStatus === "iframe-only"
        ? "Iframe Only"
        : "Disconnected"

  return (
    <GlassPanel className="annotation-overlay-panel">
      <Button
        className="w-full justify-between"
        onClick={() => {
          setCollapsed((prev) => !prev)
          if (!collapsed) {
            setEditingId(null)
            setEditState(null)
          }
        }}
        variant="ghost"
      >
        <span>Annotations</span>
        {annotations.length > 0 ? (
          <Badge variant="secondary">{annotations.length}</Badge>
        ) : null}
      </Button>

      {collapsed ? null : (
        <div className="flex flex-col gap-3 p-4 pt-0">
          <div className="flex items-center justify-between">
            <Badge variant="outline">{statusLabel}</Badge>
            <Button onClick={handleAdd} size="sm" variant="secondary">
              Add Annotation
            </Button>
          </div>

          {annotations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No annotations yet. Create one manually or run AI analysis via the command bar.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {annotations.map((annotation) => {
                const isEditing = editingId === annotation.id && editState !== null
                const isSaving = savingIds.has(annotation.id)
                const isSaved = savedIds.has(annotation.id) || annotation.savedToApi

                return (
                  <li id={`ann-${annotation.id}`} key={annotation.id}>
                    <Card size="sm">
                      <CardHeader className="flex-row items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {annotation.createdBy === "ai" ? (
                            <Badge variant="default" title="AI-generated">
                              AI
                            </Badge>
                          ) : null}
                          {annotation.confidence != null ? (
                            <Badge variant="secondary">
                              {Math.round(annotation.confidence * 100)}%
                            </Badge>
                          ) : null}
                          {annotation.category ? (
                            <Badge variant="outline">{annotation.category}</Badge>
                          ) : null}
                          {isSaved ? (
                            <Badge variant="outline" className="text-green-400 border-green-400/30">Saved</Badge>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <Button onClick={() => commitEdit(annotation.id)} size="sm" variant="ghost">
                                Save
                              </Button>
                              <Button onClick={cancelEditing} size="sm" variant="ghost">
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button onClick={() => startEditing(annotation)} size="sm" variant="ghost">
                                Edit
                              </Button>
                              {!isSaved ? (
                                <Button
                                  disabled={isSaving}
                                  onClick={() => void handleSaveToApi(annotation)}
                                  size="sm"
                                  variant="ghost"
                                >
                                  {isSaving ? "..." : "Persist"}
                                </Button>
                              ) : null}
                              <Button
                                className="text-destructive"
                                onClick={() => onRemove(annotation.id)}
                                size="sm"
                                variant="ghost"
                              >
                                Remove
                              </Button>
                            </>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent>
                        {isEditing ? (
                          <div className="flex flex-col gap-3">
                            <label className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">Label</span>
                              <Input
                                onChange={(e) => updateField("label", e.target.value)}
                                type="text"
                                value={editState.label}
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">Description</span>
                              <Textarea
                                onChange={(e) => updateField("description", e.target.value)}
                                rows={2}
                                value={editState.description}
                              />
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <label className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground">Category</span>
                                <select
                                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring"
                                  onChange={(e) => updateField("category", e.target.value)}
                                  value={editState.category}
                                >
                                  <option value="">--</option>
                                  {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground">Condition</span>
                                <select
                                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring"
                                  onChange={(e) => updateField("condition", e.target.value)}
                                  value={editState.condition}
                                >
                                  {CONDITIONS.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                              </label>
                            </div>
                            <label className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">Material</span>
                              <Input
                                onChange={(e) => updateField("material", e.target.value)}
                                type="text"
                                placeholder="e.g. Oak wood, Bronze, Silk"
                                value={editState.material}
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">Era / Period</span>
                              <Input
                                onChange={(e) => updateField("era", e.target.value)}
                                type="text"
                                placeholder="e.g. 18th Century, Art Deco"
                                value={editState.era}
                              />
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              <label className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground">Value Min</span>
                                <Input
                                  inputMode="decimal"
                                  onChange={(e) => updateField("valueMin", e.target.value)}
                                  type="text"
                                  value={editState.valueMin}
                                />
                              </label>
                              <label className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground">Value Max</span>
                                <Input
                                  inputMode="decimal"
                                  onChange={(e) => updateField("valueMax", e.target.value)}
                                  type="text"
                                  value={editState.valueMax}
                                />
                              </label>
                              <label className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground">Currency</span>
                                <select
                                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring"
                                  onChange={(e) => updateField("valueCurrency", e.target.value)}
                                  value={editState.valueCurrency}
                                >
                                  <option value="EUR">EUR</option>
                                  <option value="USD">USD</option>
                                  <option value="GBP">GBP</option>
                                  <option value="CNY">CNY</option>
                                </select>
                              </label>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <label className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground">X</span>
                                <Input
                                  inputMode="decimal"
                                  onChange={(e) => updateField("posX", e.target.value)}
                                  type="text"
                                  value={editState.posX}
                                />
                              </label>
                              <label className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground">Y</span>
                                <Input
                                  inputMode="decimal"
                                  onChange={(e) => updateField("posY", e.target.value)}
                                  type="text"
                                  value={editState.posY}
                                />
                              </label>
                              <label className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground">Z</span>
                                <Input
                                  inputMode="decimal"
                                  onChange={(e) => updateField("posZ", e.target.value)}
                                  type="text"
                                  value={editState.posZ}
                                />
                              </label>
                            </div>
                            <div className="flex gap-2 pt-2 border-t border-border/30 sticky bottom-0 bg-card/95 backdrop-blur-sm py-2">
                              <Button className="flex-1" onClick={() => commitEdit(annotation.id)} size="sm" variant="secondary">
                                Save
                              </Button>
                              <Button className="flex-1" onClick={cancelEditing} size="sm" variant="ghost">
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <strong className="text-sm">{annotation.label}</strong>
                            {annotation.description ? (
                              <p className="text-sm text-muted-foreground">{annotation.description}</p>
                            ) : null}
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                              {annotation.material ? <span>Material: {annotation.material}</span> : null}
                              {annotation.condition && annotation.condition !== "Unknown" ? (
                                <span>Condition: {annotation.condition}</span>
                              ) : null}
                              {annotation.estimatedValue?.min != null || annotation.estimatedValue?.max != null ? (
                                <span>
                                  Value: {formatValueRange(annotation.estimatedValue)}
                                </span>
                              ) : null}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              ({annotation.position.x.toFixed(2)}, {annotation.position.y.toFixed(2)}, {annotation.position.z.toFixed(2)})
                            </span>
                            {annotation.roomName ? (
                              <span className="text-xs text-muted-foreground">Room: {annotation.roomName}</span>
                            ) : null}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </GlassPanel>
  )
}

function formatValueRange(v?: { min?: number; max?: number; currency?: string }): string {
  if (!v) return ""
  const cur = v.currency ?? "EUR"
  if (v.min != null && v.max != null) return `${cur} ${v.min.toLocaleString()}-${v.max.toLocaleString()}`
  if (v.min != null) return `${cur} ${v.min.toLocaleString()}+`
  if (v.max != null) return `up to ${cur} ${v.max.toLocaleString()}`
  return ""
}
