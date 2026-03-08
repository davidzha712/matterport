"use client"

import { useCallback, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useBridge } from "@/lib/bridge-context"
import { useT } from "@/lib/i18n"
import type { UserRole } from "@/lib/use-immersive-mode"
import type { ObjectRecord, RoomRecord, SpaceRecord } from "@/lib/mock-data"

type InteractionDialogProps = {
  objects: ObjectRecord[]
  onClose: () => void
  onRoleChange: (role: UserRole) => void
  open: boolean
  role: UserRole
  room?: RoomRecord
  space: SpaceRecord
}

export function InteractionDialog({
  objects,
  onClose,
  onRoleChange,
  open,
  role,
  room,
  space,
}: InteractionDialogProps) {
  const t = useT()
  const { bridge, status } = useBridge()
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [message, setMessage] = useState("")

  const currentRoom = room ?? space.rooms[0]
  const roomObjects = objects.filter((o) => o.roomId === currentRoom?.id)
  const sdkConnected = status === "sdk-connected"

  const handleObjectClick = useCallback(
    (obj: ObjectRecord) => {
      if (sdkConnected) {
        void bridge.addAnnotation({
          label: obj.title,
          description: obj.aiSummary,
          position: { x: 0, y: 1, z: 0 },
          createdBy: "manual",
        })
      }
    },
    [bridge, sdkConnected]
  )

  const handleSaveEdit = useCallback(() => {
    if (!editingField || !editValue.trim()) return
    setMessage(`${editingField}: ${editValue}`)
    setEditingField(null)
    setEditValue("")
    setTimeout(() => setMessage(""), 3000)
  }, [editingField, editValue])

  const handleVisitorInteract = useCallback(
    (obj: ObjectRecord) => {
      setMessage(`${t.ai.detectObjects}: ${obj.title}`)
      window.dispatchEvent(
        new CustomEvent("annotation-from-ai", {
          detail: { label: obj.title, description: obj.aiSummary },
        })
      )
      setTimeout(() => setMessage(""), 3000)
    },
    [t]
  )

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="interaction-dialog__backdrop"
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="interaction-dialog" role="dialog" aria-label={t.stage.spatialContext}>
            <div className="interaction-dialog__header">
              <div>
                <p className="interaction-dialog__eyebrow">
                  {sdkConnected ? t.connection.sdkConnected : t.connection.iframeOnly}
                </p>
                <h3 className="interaction-dialog__title">
                  {currentRoom?.name ?? space.name}
                </h3>
              </div>
              <div className="interaction-dialog__actions">
                <div className="interaction-dialog__role-switch" role="radiogroup">
                  <button
                    aria-checked={role === "visitor"}
                    className={`interaction-dialog__role-btn${role === "visitor" ? " interaction-dialog__role-btn--active" : ""}`}
                    onClick={() => onRoleChange("visitor")}
                    role="radio"
                    type="button"
                  >
                    Visitor
                  </button>
                  <button
                    aria-checked={role === "admin"}
                    className={`interaction-dialog__role-btn${role === "admin" ? " interaction-dialog__role-btn--active" : ""}`}
                    onClick={() => onRoleChange("admin")}
                    role="radio"
                    type="button"
                  >
                    Admin
                  </button>
                </div>
                <button
                  className="interaction-dialog__close"
                  onClick={onClose}
                  type="button"
                >
                  ESC
                </button>
              </div>
            </div>

            {message ? (
              <div className="interaction-dialog__toast" aria-live="polite">
                {message}
              </div>
            ) : null}

            <div className="interaction-dialog__body">
              {currentRoom ? (
                <div className="interaction-dialog__section">
                  <p className="interaction-dialog__section-label">{t.stage.roomContext}</p>
                  <p className="interaction-dialog__room-name">{currentRoom.name}</p>
                  {currentRoom.summary ? (
                    <p className="interaction-dialog__description">{currentRoom.summary}</p>
                  ) : null}
                </div>
              ) : null}

              {roomObjects.length > 0 ? (
                <div className="interaction-dialog__section">
                  <p className="interaction-dialog__section-label">
                    {t.common.objects} ({roomObjects.length})
                  </p>
                  <ul className="interaction-dialog__object-list">
                    {roomObjects.map((obj) => (
                      <li className="interaction-dialog__object-item" key={obj.id}>
                        <div className="interaction-dialog__object-info">
                          <strong>{obj.title}</strong>
                          {obj.type ? (
                            <span className="interaction-dialog__object-type">{obj.type}</span>
                          ) : null}
                        </div>

                        {role === "admin" ? (
                          <div className="interaction-dialog__object-actions">
                            <button
                              className="interaction-dialog__action-btn"
                              onClick={() => {
                                setEditingField(obj.title)
                                setEditValue(obj.aiSummary)
                              }}
                              type="button"
                            >
                              {t.common.edit}
                            </button>
                            <button
                              className="interaction-dialog__action-btn"
                              onClick={() => handleObjectClick(obj)}
                              type="button"
                            >
                              {t.ai.addAnnotation}
                            </button>
                          </div>
                        ) : (
                          <button
                            className="interaction-dialog__action-btn interaction-dialog__action-btn--interact"
                            onClick={() => handleVisitorInteract(obj)}
                            type="button"
                          >
                            {t.ai.detectObjects}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="interaction-dialog__empty">{t.ai.noAnnotations}</p>
              )}

              {role === "admin" && editingField ? (
                <div className="interaction-dialog__editor">
                  <p className="interaction-dialog__section-label">
                    {t.common.edit}: {editingField}
                  </p>
                  <textarea
                    className="interaction-dialog__textarea"
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={3}
                    value={editValue}
                  />
                  <div className="interaction-dialog__editor-actions">
                    <button
                      className="interaction-dialog__action-btn"
                      onClick={() => setEditingField(null)}
                      type="button"
                    >
                      {t.common.cancel}
                    </button>
                    <button
                      className="interaction-dialog__action-btn interaction-dialog__action-btn--primary"
                      onClick={handleSaveEdit}
                      type="button"
                    >
                      {t.common.save}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="interaction-dialog__footer">
              <span className="interaction-dialog__hint">
                Space — {role === "admin" ? t.common.edit : t.ai.detectObjects}
              </span>
              <span className="interaction-dialog__hint">ESC — {t.common.close}</span>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
