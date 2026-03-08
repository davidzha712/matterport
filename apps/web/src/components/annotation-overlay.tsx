"use client"

import { useCallback, useState } from "react"
import type { SpatialAnnotation } from "@/lib/platform-types"
import { GlassPanel } from "@/components/gallery"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type AnnotationOverlayProps = {
  annotations: SpatialAnnotation[]
  bridgeStatus: "disconnected" | "iframe-only" | "sdk-connected"
  onAdd: (data: Omit<SpatialAnnotation, "id">) => void
  onRemove: (id: string) => void
  onUpdate: (id: string, updates: Partial<Omit<SpatialAnnotation, "id">>) => void
}

type EditingState = {
  description: string
  label: string
  posX: string
  posY: string
  posZ: string
}

function buildEditingState(annotation: SpatialAnnotation): EditingState {
  return {
    description: annotation.description,
    label: annotation.label,
    posX: String(annotation.position.x),
    posY: String(annotation.position.y),
    posZ: String(annotation.position.z)
  }
}

function buildDefaultAnnotation(): Omit<SpatialAnnotation, "id"> {
  return {
    label: "Neue Annotation",
    description: "",
    position: { x: 0, y: 0, z: 0 },
    createdBy: "manual"
  }
}

export function AnnotationOverlay({
  annotations,
  bridgeStatus,
  onAdd,
  onRemove,
  onUpdate
}: AnnotationOverlayProps) {
  const [collapsed, setCollapsed] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditingState | null>(null)

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
      onUpdate(id, {
        description: editState.description,
        label: editState.label,
        position: {
          x: Number.isFinite(x) ? x : 0,
          y: Number.isFinite(y) ? y : 0,
          z: Number.isFinite(z) ? z : 0
        }
      })
      setEditingId(null)
      setEditState(null)
    },
    [editState, onUpdate]
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

  const statusLabel =
    bridgeStatus === "sdk-connected"
      ? "SDK verbunden"
      : bridgeStatus === "iframe-only"
        ? "Nur Iframe"
        : "Getrennt"

  return (
    <GlassPanel className="fixed bottom-4 right-4 z-40 w-80">
      <Button
        className="w-full justify-between"
        onClick={() => setCollapsed((prev) => !prev)}
        variant="ghost"
      >
        <span>Annotationen</span>
        {annotations.length > 0 ? (
          <Badge variant="secondary">{annotations.length}</Badge>
        ) : null}
      </Button>

      {collapsed ? null : (
        <div className="flex flex-col gap-3 p-4 pt-0">
          <div className="flex items-center justify-between">
            <Badge variant="outline">{statusLabel}</Badge>
            <Button onClick={handleAdd} size="sm" variant="secondary">
              Annotation hinzufuegen
            </Button>
          </div>

          {annotations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Noch keine Annotationen vorhanden. Erstelle eine manuell oder starte eine
              KI-Analyse ueber die Befehlsebene.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {annotations.map((annotation) => {
                const isEditing = editingId === annotation.id && editState !== null

                return (
                  <li key={annotation.id}>
                    <Card size="sm">
                      <CardHeader className="flex-row items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {annotation.createdBy === "ai" ? (
                            <Badge variant="default" title="KI-generiert">
                              KI
                            </Badge>
                          ) : null}
                          {annotation.confidence != null ? (
                            <Badge variant="secondary">
                              {Math.round(annotation.confidence * 100)}%
                            </Badge>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                onClick={() => commitEdit(annotation.id)}
                                size="sm"
                                variant="ghost"
                              >
                                Speichern
                              </Button>
                              <Button
                                onClick={cancelEditing}
                                size="sm"
                                variant="ghost"
                              >
                                Abbrechen
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                onClick={() => startEditing(annotation)}
                                size="sm"
                                variant="ghost"
                              >
                                Bearbeiten
                              </Button>
                              <Button
                                className="text-destructive"
                                onClick={() => onRemove(annotation.id)}
                                size="sm"
                                variant="ghost"
                              >
                                Entfernen
                              </Button>
                            </>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent>
                        {isEditing ? (
                          <div className="flex flex-col gap-3">
                            <label className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">Bezeichnung</span>
                              <Input
                                onChange={(e) => updateField("label", e.target.value)}
                                type="text"
                                value={editState.label}
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">Beschreibung</span>
                              <Input
                                onChange={(e) => updateField("description", e.target.value)}
                                type="text"
                                value={editState.description}
                              />
                            </label>
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
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <strong className="text-sm">{annotation.label}</strong>
                            {annotation.description ? (
                              <p className="text-sm text-muted-foreground">{annotation.description}</p>
                            ) : null}
                            <span className="text-xs text-muted-foreground">
                              ({annotation.position.x}, {annotation.position.y}, {annotation.position.z})
                            </span>
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
