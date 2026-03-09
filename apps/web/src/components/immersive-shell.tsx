"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { motion, useReducedMotion, AnimatePresence } from "framer-motion"
import { AIProgressOverlay } from "@/components/ai-progress-overlay"
import { CommandBar } from "@/components/command-bar"
import { ContextPanel } from "@/components/context-panel"
import { InteractionDialog } from "@/components/interaction-dialog"
import { MatterportStage } from "@/components/matterport-stage"
import { MeasureTool } from "@/components/measure-tool"
import { ModeRail } from "@/components/mode-rail"
import { StageControls } from "@/components/stage-controls"
import { StageToolbar } from "@/components/stage-toolbar"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { BridgeProvider, useBridge } from "@/lib/bridge-context"
import { useT } from "@/lib/i18n"
import { useAutoTour } from "@/lib/use-auto-tour"
import { useImmersiveMode } from "@/lib/use-immersive-mode"
import type { ObjectRecord, ProviderProfile, RoomRecord, SpaceRecord } from "@/lib/platform-types"
import { buildSpaceRoute } from "@/lib/routes"
import { stageModeLabels, type StageMode } from "@/lib/routes"
import { getStageModeConfig } from "@/lib/stage-mode-config"

type ImmersiveShellProps = {
  focusMode: StageMode
  providers: ProviderProfile[]
  selectedObject?: ObjectRecord
  selectedRoom?: RoomRecord
  space: SpaceRecord
}

export function ImmersiveShell(props: ImmersiveShellProps) {
  return (
    <BridgeProvider>
      <ImmersiveShellInner {...props} />
    </BridgeProvider>
  )
}

function ImmersiveShellInner({
  focusMode,
  providers,
  selectedObject,
  selectedRoom,
  space
}: ImmersiveShellProps) {
  const reduceMotion = useReducedMotion()
  const t = useT()
  const { bridge, status, currentRoom: sdkRoom, currentSweep, currentMode, isTourActive, sdkRooms } = useBridge()
  const {
    isImmersive,
    showDialog,
    role,
    enterImmersive,
    exitImmersive,
    setRole,
    setShowDialog,
  } = useImmersiveMode(bridge)
  const { autoTourState, stopAutoTour } = useAutoTour(bridge, status, isTourActive)
  const modeConfig = getStageModeConfig(focusMode)
  const [showDimensions, setShowDimensions] = useState(false)
  const [measureActive, setMeasureActive] = useState(false)
  const [modelName, setModelName] = useState<string | null>(null)
  const [apiObjects, setApiObjects] = useState<ObjectRecord[]>([])
  const [apiObjectCount, setApiObjectCount] = useState<number | null>(null)

  // V key → auto-vision analysis in immersive mode
  const triggerVisionAnalysis = useCallback(() => {
    window.dispatchEvent(new CustomEvent("auto-vision-analyze"))
  }, [])

  useEffect(() => {
    if (!isImmersive || status !== "sdk-connected") return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "v" || e.key === "V") {
        e.preventDefault()
        triggerVisionAnalysis()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isImmersive, status, triggerVisionAnalysis])

  // Fetch model details from SDK once connected
  useEffect(() => {
    if (status !== "sdk-connected") return
    void bridge.getModelDetails().then((details) => {
      if (details?.name) setModelName(details.name)
    })
  }, [bridge, status])

  // Fetch persisted objects from API
  useEffect(() => {
    void fetch(`/api/objects?spaceId=${encodeURIComponent(space.id)}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.objects) {
          setApiObjects(data.objects as ObjectRecord[])
          setApiObjectCount(data.objects.length)
        }
      })
      .catch(() => {})
  }, [space.id])

  // Re-fetch objects when updated
  useEffect(() => {
    function onUpdated() {
      void fetch(`/api/objects?spaceId=${encodeURIComponent(space.id)}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.objects) {
            setApiObjects(data.objects as ObjectRecord[])
            setApiObjectCount(data.objects.length)
          }
        })
        .catch(() => {})
    }
    window.addEventListener("objects-updated", onUpdated)
    return () => window.removeEventListener("objects-updated", onUpdated)
  }, [space.id])

  // Compute room dimensions from SDK bounds (meters)
  const roomDimensions = sdkRoom?.bounds
    ? {
        width: Math.abs(sdkRoom.bounds.max.x - sdkRoom.bounds.min.x).toFixed(1),
        depth: Math.abs(sdkRoom.bounds.max.z - sdkRoom.bounds.min.z).toFixed(1),
        height: Math.abs(sdkRoom.bounds.max.y - sdkRoom.bounds.min.y).toFixed(1),
      }
    : null

  // Build runtime room list: prefer SDK rooms (real), merge with CMS rooms
  const runtimeRooms: RoomRecord[] = sdkRooms.length > 0
    ? sdkRooms.filter((sr) => sr.name).map((sr) => {
        const cmsMatch = space.rooms.find(
          (r) => r.name.toLowerCase() === sr.name.toLowerCase() || r.id === sr.id
        )
        return cmsMatch ?? {
          id: sr.id,
          name: sr.name,
          objectIds: [],
          pendingReviewCount: 0,
          priorityBand: "Medium" as const,
          recommendation: "",
          summary: "",
        }
      })
    : space.rooms

  // Match current SDK room to runtime room list
  const matchedRoom = sdkRoom
    ? runtimeRooms.find((r) =>
        (sdkRoom.name && r.name.toLowerCase() === sdkRoom.name.toLowerCase()) ||
        r.id === sdkRoom.id
      )
    : undefined

  const focalRoom = selectedRoom ?? matchedRoom ?? runtimeRooms[0]

  // Match objects by room — only show API-detected objects or CMS objects
  // that actually belong to this room (no mock fallback to unrelated objects)
  const apiRoomObjects = apiObjects.filter(
    (o) => o.roomId === focalRoom?.id || o.roomName?.toLowerCase() === focalRoom?.name.toLowerCase()
  )
  const dataRoomObjects = status !== "sdk-connected"
    ? space.objects.filter((o) => o.roomId === focalRoom?.id)
    : []
  const roomObjects = apiRoomObjects.length > 0 ? apiRoomObjects : dataRoomObjects
  const focalObject = selectedObject ?? roomObjects[0] ?? apiObjects[0]

  const dur = reduceMotion ? 0 : 0.4
  const ease = [0.22, 1, 0.36, 1] as const
  const immersiveDur = reduceMotion ? 0 : 0.6

  // Chrome animation targets — slide out when immersive, slide in when normal
  const topbarAnimate = isImmersive
    ? { opacity: 0, y: -60 }
    : { opacity: 1, y: 0 }
  const leftAnimate = isImmersive
    ? { opacity: 0, x: -80 }
    : { opacity: 1, x: 0 }
  const rightAnimate = isImmersive
    ? { opacity: 0, x: 80 }
    : { opacity: 1, x: 0 }
  const bottomAnimate = isImmersive
    ? { opacity: 0, y: 60 }
    : { opacity: 1, y: 0 }

  return (
    <main
      className={`immersive-shell immersive-shell--stage ${modeConfig.accentClass}${isImmersive ? " immersive-shell--immersive" : ""}`}
      data-stage-mode={focusMode}
      id="main-content"
    >
      <MatterportStage space={space}>
        {/* Top bar */}
        <motion.header
          animate={topbarAnimate}
          className="immersive-topbar immersive-topbar--floating"
          initial={reduceMotion ? false : { opacity: 0, y: -16 }}
          style={{ pointerEvents: isImmersive ? "none" : "auto" }}
          transition={{ duration: isImmersive ? immersiveDur : dur, ease }}
        >
          <div className="immersive-topbar__brand">
            <div className="immersive-breadcrumbs">
              <span>{space.projectName}</span>
              <span>{space.name}</span>
              <span>{stageModeLabels[focusMode]}</span>
            </div>
            <p className="eyebrow">{t.hero.eyebrow}</p>
            <h1>{space.projectName}</h1>
          </div>
          <nav aria-label="Global">
            <ul className="inline-nav">
              <li>
                <Link href="/">{t.stage.overview}</Link>
              </li>
              <li>
                <Link href="/settings/providers">{t.stage.providers}</Link>
              </li>
              <li>
                <Link href="/review-center">{t.stage.reviewCenter}</Link>
              </li>
              <li>
                <Link href="/export-center">{t.stage.export}</Link>
              </li>
              <li>
                <Link href={buildSpaceRoute(space.id, "review")}>{t.stage.stageReview}</Link>
              </li>
              <li className="inline-nav__locale">
                <LocaleSwitcher />
              </li>
            </ul>
          </nav>
        </motion.header>

        {/* Left panel: intro + command bar */}
        {modeConfig.panels.leftPanel ? (
          <motion.section
            animate={leftAnimate}
            className="stage-command-cluster"
            initial={reduceMotion ? false : { opacity: 0, x: -24 }}
            style={{ pointerEvents: isImmersive ? "none" : "auto" }}
            transition={{ duration: isImmersive ? immersiveDur : dur, ease, delay: reduceMotion ? 0 : 0.08 }}
          >
            <div className={`stage-intro-card stage-intro-card--${modeConfig.introCardVariant}`}>
              <div>
                <p className="eyebrow">{t.stage.currentScene}</p>
                <h2>{modelName ?? space.name}</h2>
              </div>
              {modeConfig.introCardVariant === "narrative" ? (
                <p className="stage-intro-card__narrative">
                  {bridge.modelDetails?.summary ?? bridge.modelDetails?.description ?? space.summary}
                </p>
              ) : modeConfig.introCardVariant === "sell-focused" ? (
                <>
                  <p>{bridge.modelDetails?.summary ?? bridge.modelDetails?.description ?? space.summary}</p>
                  <div className="stage-intro-card__sell-badge">{t.listingPrep.badge}</div>
                </>
              ) : (
                <p>{bridge.modelDetails?.summary ?? bridge.modelDetails?.description ?? space.summary}</p>
              )}
              <ul className="stage-intro-card__metrics">
                <li>{runtimeRooms.length} {t.stage.roomsCaptured}</li>
                <li>{status === "sdk-connected" ? (apiObjectCount ?? 0) : (apiObjectCount ?? space.objects.length)} {t.stage.objectsTracked}</li>
                <li>{t.stage.mode}: {stageModeLabels[focusMode]}</li>
                {modeConfig.showReviewCounts ? (
                  <li>{runtimeRooms.reduce((sum, r) => sum + r.pendingReviewCount, 0)} {t.workflow.needsReview}</li>
                ) : null}
              </ul>
              {modeConfig.introCardVariant !== "compact" ? (
                <div className="stage-highlight-rail">
                  {focalObject ? (
                    <div className="stage-highlight-card">
                      <span>{t.stage.objectFocus}</span>
                      <strong>{focalObject.title}</strong>
                    </div>
                  ) : null}
                  <div className="stage-highlight-card">
                    <span>{t.stage.roomContext}</span>
                    <strong>{focalRoom?.name ?? sdkRoom?.name ?? space.name}</strong>
                  </div>
                </div>
              ) : null}
            </div>
            {modeConfig.panels.commandBar ? (
              <CommandBar room={focalRoom} space={space} />
            ) : null}
          </motion.section>
        ) : null}

        {/* Right panel: context */}
        {modeConfig.panels.rightPanel ? (
          <motion.aside
            animate={rightAnimate}
            className="stage-context-slot"
            initial={reduceMotion ? false : { opacity: 0, x: 28 }}
            style={{ pointerEvents: isImmersive ? "none" : "auto" }}
            transition={{ duration: isImmersive ? immersiveDur : dur, ease, delay: reduceMotion ? 0 : 0.12 }}
          >
            <ContextPanel
              panelConfig={modeConfig.panels}
              providers={providers}
              selectedObject={selectedObject}
              selectedRoom={selectedRoom}
              showReviewCounts={modeConfig.showReviewCounts}
              space={space}
            />
          </motion.aside>
        ) : null}

        <StageControls annotationMode={modeConfig.annotations} spaceId={space.id} />
        <StageToolbar
          bridge={bridge}
          currentRoom={sdkRoom}
          measureActive={measureActive}
          onMeasureToggle={() => setMeasureActive((v) => !v)}
          toolbarConfig={modeConfig.toolbar}
        />
        {modeConfig.toolbar.measure ? (
          <MeasureTool active={measureActive} onClose={() => setMeasureActive(false)} />
        ) : null}
        <AIProgressOverlay />

        {/* Bottom chrome */}
        <motion.footer
          animate={bottomAnimate}
          className="stage-bottom-chrome"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          style={{ pointerEvents: isImmersive ? "none" : "auto" }}
          transition={{ duration: isImmersive ? immersiveDur : dur, ease, delay: reduceMotion ? 0 : 0.2 }}
        >
          <div className={`stage-storyline${modeConfig.bottomChrome.storylineSize === "large" ? " stage-storyline--large" : ""}`}>
            <div>
              <p className="eyebrow">{t.stage.spatialContext}</p>
              <strong>{focalRoom?.name ?? sdkRoom?.name ?? space.name}</strong>
            </div>
            {focalObject ? <p>{focalObject.title}</p> : null}
            {autoTourState === "touring" ? (
              <button
                className="stage-storyline__auto-tour-btn"
                onClick={stopAutoTour}
                type="button"
              >
                {t.tour.stopTour}
              </button>
            ) : null}
          </div>
          <ModeRail currentMode={focusMode} spaceId={space.id} />
        </motion.footer>

        {/* Immersive mode toggle button */}
        <AnimatePresence>
          {!isImmersive ? (
            <motion.button
              animate={{ opacity: 1, scale: 1 }}
              className="immersive-enter-btn"
              exit={{ opacity: 0, scale: 0.8 }}
              initial={{ opacity: 0, scale: 0.8 }}
              onClick={enterImmersive}
              title={`${t.immersive.immersiveMode} (WASD)`}
              transition={{ duration: 0.3, ease }}
              type="button"
            >
              <span className="immersive-enter-btn__icon" aria-hidden="true" />
              {t.immersive.immersiveMode}
            </motion.button>
          ) : null}
        </AnimatePresence>

        {/* Immersive mode HUD overlay */}
        <AnimatePresence>
          {isImmersive ? (
            <motion.div
              animate={{ opacity: 1 }}
              className="immersive-hud"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              transition={{ duration: 0.4, ease }}
            >
              <div className="immersive-hud__top">
                <div className="immersive-hud__room-info">
                  <span className="immersive-hud__label">{sdkRoom?.name ?? focalRoom?.name ?? space.name}</span>
                  {currentSweep ? (
                    <span className="immersive-hud__sweep">
                      Sweep: {currentSweep.sid.slice(0, 8)}
                      {currentSweep.neighbors.length > 0 ? ` · ${currentSweep.neighbors.length} neighbors` : ""}
                    </span>
                  ) : null}
                  {roomDimensions ? (
                    <button
                      className="immersive-hud__dim-toggle"
                      onClick={() => setShowDimensions((v) => !v)}
                      type="button"
                    >
                      {showDimensions ? t.immersive.hideDimensions : t.immersive.showDimensions}
                    </button>
                  ) : null}
                  {showDimensions && roomDimensions ? (
                    <div className="immersive-hud__dimensions">
                      <span>{roomDimensions.width}m W</span>
                      <span>{roomDimensions.depth}m D</span>
                      <span>{roomDimensions.height}m H</span>
                    </div>
                  ) : null}
                </div>
                <div className="immersive-hud__badges">
                  <span className="immersive-hud__status">
                    {status === "sdk-connected" ? "SDK" : "Iframe"}
                  </span>
                  <span className="immersive-hud__mode-badge">
                    {currentMode}
                  </span>
                  {isTourActive ? (
                    <span className="immersive-hud__tour-badge">
                      {autoTourState === "touring" ? t.tour.autoTour : t.tour.tourActive}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="immersive-hud__bottom">
                <span className="immersive-hud__hint">WASD — {t.immersive.move}</span>
                <span className="immersive-hud__hint">Space — {modeConfig.immersiveHints.spaceKeyAction}</span>
                {modeConfig.immersiveHints.showVKey ? (
                  <span className="immersive-hud__hint">V — {t.ai.detectObjects}</span>
                ) : null}
                <span className="immersive-hud__hint">ESC — {t.immersive.exit}</span>
              </div>
              <button
                className="immersive-hud__exit"
                onClick={exitImmersive}
                type="button"
              >
                ESC
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Interaction dialog (Space key) */}
        <InteractionDialog
          objects={apiObjects.length > 0 ? apiObjects : (status === "sdk-connected" ? [] : space.objects)}
          onClose={() => setShowDialog(false)}
          onRoleChange={setRole}
          open={showDialog}
          role={role}
          room={focalRoom}
          space={space}
        />
      </MatterportStage>
    </main>
  )
}
