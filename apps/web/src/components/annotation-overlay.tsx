"use client"

import { useCallback, useEffect, useState } from "react"
import type { ObjectCondition, SpatialAnnotation } from "@/lib/platform-types"
import type { MatterportBridge } from "@/lib/matterport-bridge"
import { useT } from "@/lib/i18n"
import { GlassPanel } from "@/components/gallery"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type AnnotationOverlayProps = {
  annotations: SpatialAnnotation[]
  bridge?: MatterportBridge
  bridgeStatus: "disconnected" | "iframe-only" | "sdk-connected"
  onAdd: (data: Omit<SpatialAnnotation, "id">) => void
  onFocusTag?: (tagId: string) => void
  onRemove: (id: string) => Promise<void> | void
  onUpdate: (id: string, updates: Partial<Omit<SpatialAnnotation, "id">>) => void
  readOnly?: boolean
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
  bridge: bridgeRef,
  bridgeStatus,
  onAdd,
  onFocusTag,
  onRemove,
  onUpdate,
  readOnly,
}: AnnotationOverlayProps) {
  const t = useT()
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
    if (annotation.tagId && onFocusTag) {
      onFocusTag(annotation.tagId)
    }
    // Dim other tags in 3D view to focus on the selected one
    if (bridgeRef) {
      const tagId = bridgeRef.getTagIdForAnnotation(annotation.id)
      void bridgeRef.focusTag(tagId ?? null)
    }
  }, [bridgeRef, onFocusTag])

  const cancelEditing = useCallback(() => {
    setEditingId(null)
    setEditState(null)
    // Restore all tags to full opacity
    if (bridgeRef) {
      void bridgeRef.unfocusAllTags()
    }
  }, [bridgeRef])

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

      // Restore all tags to full opacity
      if (bridgeRef) {
        void bridgeRef.unfocusAllTags()
      }

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
    [annotations, bridgeRef, editState, onUpdate]
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
      ? t.connection.sdkConnected
      : bridgeStatus === "iframe-only"
        ? t.connection.iframeOnly
        : t.connection.disconnected

  return (
    <GlassPanel className="annotation-overlay-panel">
      <Button
        className="w-full justify-between"
        onClick={() => {
          setCollapsed((prev) => !prev)
          if (!collapsed) {
            setEditingId(null)
            setEditState(null)
            if (bridgeRef) {
              void bridgeRef.unfocusAllTags()
            }
          }
        }}
        variant="ghost"
      >
        <span>{t.ai.annotations}</span>
        {annotations.length > 0 ? (
          <Badge variant="secondary">{annotations.length}</Badge>
        ) : null}
      </Button>

      {collapsed ? null : (
        <div className="flex flex-col gap-3 p-4 pt-0">
          {/* ─── Focused Edit Mode: show only the edited annotation ─── */}
          {editingId && editState ? (
            (() => {
              const annotation = annotations.find((a) => a.id === editingId)
              if (!annotation) return null
              const isSaved = savedIds.has(annotation.id) || annotation.savedToApi
              return (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <Button onClick={cancelEditing} size="sm" variant="ghost">
                      {t.common.back}
                    </Button>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {annotation.createdBy === "ai" ? (
                        <Badge variant="default" title="AI-generated">AI</Badge>
                      ) : null}
                      {annotation.category ? (
                        <Badge variant="outline">{annotation.category}</Badge>
                      ) : null}
                      {isSaved ? (
                        <Badge variant="outline" className="text-green-400 border-green-400/30">{t.annotationFields.saved}</Badge>
                      ) : null}
                    </div>
                  </div>
                  {readOnly ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">{t.annotationFields.label}</span>
                        <p className="text-sm">{editState.label || "—"}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">{t.annotationFields.description}</span>
                        <p className="text-sm whitespace-pre-wrap">{editState.description || "—"}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">{t.annotationFields.category}</span>
                          <p className="text-sm">{editState.category || "—"}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">{t.annotationFields.condition}</span>
                          <p className="text-sm">{editState.condition || "—"}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">{t.annotationFields.material}</span>
                        <p className="text-sm">{editState.material || "—"}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">{t.annotationFields.era}</span>
                        <p className="text-sm">{editState.era || "—"}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">{t.annotationFields.valueMin}</span>
                          <p className="text-sm">{editState.valueMin || "—"}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">{t.annotationFields.valueMax}</span>
                          <p className="text-sm">{editState.valueMax || "—"}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">{t.annotationFields.currency}</span>
                          <p className="text-sm">{editState.valueCurrency || "—"}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">X</span>
                          <p className="text-sm">{editState.posX}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">Y</span>
                          <p className="text-sm">{editState.posY}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">Z</span>
                          <p className="text-sm">{editState.posZ}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2 border-t border-border/30 sticky bottom-0 bg-card/95 backdrop-blur-sm py-2">
                        <Button className="flex-1" onClick={cancelEditing} size="sm" variant="ghost">
                          {t.common.back}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <label className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">{t.annotationFields.label}</span>
                        <Input
                          onChange={(e) => updateField("label", e.target.value)}
                          type="text"
                          value={editState.label}
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">{t.annotationFields.description}</span>
                        <Textarea
                          onChange={(e) => updateField("description", e.target.value)}
                          rows={2}
                          value={editState.description}
                        />
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">{t.annotationFields.category}</span>
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
                          <span className="text-xs text-muted-foreground">{t.annotationFields.condition}</span>
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
                        <span className="text-xs text-muted-foreground">{t.annotationFields.material}</span>
                        <Input
                          onChange={(e) => updateField("material", e.target.value)}
                          type="text"
                          placeholder="e.g. Oak wood, Bronze, Silk"
                          value={editState.material}
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">{t.annotationFields.era}</span>
                        <Input
                          onChange={(e) => updateField("era", e.target.value)}
                          type="text"
                          placeholder="e.g. 18th Century, Art Deco"
                          value={editState.era}
                        />
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <label className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">{t.annotationFields.valueMin}</span>
                          <Input
                            inputMode="decimal"
                            onChange={(e) => updateField("valueMin", e.target.value)}
                            type="text"
                            value={editState.valueMin}
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">{t.annotationFields.valueMax}</span>
                          <Input
                            inputMode="decimal"
                            onChange={(e) => updateField("valueMax", e.target.value)}
                            type="text"
                            value={editState.valueMax}
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">{t.annotationFields.currency}</span>
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
                        <Button className="flex-1" onClick={() => commitEdit(editingId)} size="sm" variant="secondary">
                          {t.common.save}
                        </Button>
                        <Button
                          className="text-destructive"
                          onClick={() => { cancelEditing(); void onRemove(annotation.id) }}
                          size="sm"
                          variant="ghost"
                        >
                          {t.annotationFields.remove}
                        </Button>
                        <Button className="flex-1" onClick={cancelEditing} size="sm" variant="ghost">
                          {t.common.cancel}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()
          ) : (
            /* ─── List Mode: show all annotations ─── */
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{statusLabel}</Badge>
                {readOnly ? null : (
                  <Button onClick={handleAdd} size="sm" variant="secondary">
                    {t.ai.addAnnotation}
                  </Button>
                )}
              </div>

              {annotations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t.ai.noAnnotations}
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {annotations.map((annotation) => {
                    const isSaving = savingIds.has(annotation.id)
                    const isSaved = savedIds.has(annotation.id) || annotation.savedToApi

                    return (
                      <li id={`ann-${annotation.id}`} key={annotation.id}>
                        <Card
                          size="sm"
                          className="cursor-pointer transition-colors hover:border-accent/30"
                          onClick={() => startEditing(annotation)}
                        >
                          <CardContent className="flex items-center justify-between gap-2 py-2.5 px-3">
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {annotation.createdBy === "ai" ? (
                                  <Badge variant="default" title="AI-generated" className="text-[10px] px-1.5 py-0">
                                    AI
                                  </Badge>
                                ) : null}
                                <strong className="text-sm truncate">{annotation.label}</strong>
                              </div>
                              <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                                {annotation.category ? <span>{annotation.category}</span> : null}
                                {annotation.roomName ? <span>{annotation.roomName}</span> : null}
                                {annotation.confidence != null ? (
                                  <span>{Math.round(annotation.confidence * 100)}%</span>
                                ) : null}
                              </div>
                            </div>
                            {readOnly ? null : (
                              <div className="flex items-center gap-1 shrink-0">
                                {isSaved ? (
                                  <Badge variant="outline" className="text-green-400 border-green-400/30 text-[10px]">{t.annotationFields.saved}</Badge>
                                ) : isSaving ? (
                                  <Badge variant="outline" className="text-[10px]">...</Badge>
                                ) : (
                                  <Button
                                    onClick={(e) => { e.stopPropagation(); void handleSaveToApi(annotation) }}
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs h-6 px-2"
                                  >
                                    {t.common.save}
                                  </Button>
                                )}
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
        </div>
      )}
    </GlassPanel>
  )
}
