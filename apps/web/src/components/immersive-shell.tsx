"use client"

import Link from "next/link"
import { motion, useReducedMotion, AnimatePresence } from "framer-motion"
import { CommandBar } from "@/components/command-bar"
import { ContextPanel } from "@/components/context-panel"
import { InteractionDialog } from "@/components/interaction-dialog"
import { MatterportStage } from "@/components/matterport-stage"
import { ModeRail } from "@/components/mode-rail"
import { StageControls } from "@/components/stage-controls"
import { StageToolbar } from "@/components/stage-toolbar"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { BridgeProvider, useBridge } from "@/lib/bridge-context"
import { useT } from "@/lib/i18n"
import { useImmersiveMode } from "@/lib/use-immersive-mode"
import type { ObjectRecord, ProviderProfile, RoomRecord, SpaceRecord } from "@/lib/mock-data"
import { buildSpaceRoute } from "@/lib/routes"
import { stageModeLabels, type StageMode } from "@/lib/routes"

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
  const { bridge, status } = useBridge()
  const {
    isImmersive,
    showDialog,
    role,
    enterImmersive,
    exitImmersive,
    setRole,
    setShowDialog,
  } = useImmersiveMode(bridge)

  const focalRoom = selectedRoom ?? space.rooms[0]
  const focalObject = selectedObject ?? space.objects[0]

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
      className={`immersive-shell immersive-shell--stage${isImmersive ? " immersive-shell--immersive" : ""}`}
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
        <motion.section
          animate={leftAnimate}
          className="stage-command-cluster"
          initial={reduceMotion ? false : { opacity: 0, x: -24 }}
          style={{ pointerEvents: isImmersive ? "none" : "auto" }}
          transition={{ duration: isImmersive ? immersiveDur : dur, ease, delay: reduceMotion ? 0 : 0.08 }}
        >
          <div className="stage-intro-card">
            <div>
              <p className="eyebrow">{t.stage.currentScene}</p>
              <h2>{space.name}</h2>
            </div>
            <p>{space.summary}</p>
            <ul className="stage-intro-card__metrics">
              <li>{space.rooms.length} {t.stage.roomsCaptured}</li>
              <li>{space.objects.length} {t.stage.objectsTracked}</li>
              <li>{t.stage.mode}: {stageModeLabels[focusMode]}</li>
            </ul>
            <div className="stage-highlight-rail">
              <div className="stage-highlight-card">
                <span>{t.stage.objectFocus}</span>
                <strong>{focalObject.title}</strong>
              </div>
              <div className="stage-highlight-card">
                <span>{t.stage.roomContext}</span>
                <strong>{focalRoom.name}</strong>
              </div>
            </div>
          </div>
          <CommandBar room={focalRoom} space={space} />
        </motion.section>

        {/* Right panel: context */}
        <motion.aside
          animate={rightAnimate}
          className="stage-context-slot"
          initial={reduceMotion ? false : { opacity: 0, x: 28 }}
          style={{ pointerEvents: isImmersive ? "none" : "auto" }}
          transition={{ duration: isImmersive ? immersiveDur : dur, ease, delay: reduceMotion ? 0 : 0.12 }}
        >
          <ContextPanel
            providers={providers}
            selectedObject={selectedObject}
            selectedRoom={selectedRoom}
            space={space}
          />
        </motion.aside>

        <StageControls />
        <StageToolbar bridge={bridge} />

        {/* Bottom chrome */}
        <motion.footer
          animate={bottomAnimate}
          className="stage-bottom-chrome"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          style={{ pointerEvents: isImmersive ? "none" : "auto" }}
          transition={{ duration: isImmersive ? immersiveDur : dur, ease, delay: reduceMotion ? 0 : 0.2 }}
        >
          <div className="stage-storyline">
            <div>
              <p className="eyebrow">{t.stage.spatialContext}</p>
              <strong>{focalRoom.name}</strong>
            </div>
            <p>{focalObject.title}</p>
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
              title="Immersive Mode (WASD)"
              transition={{ duration: 0.3, ease }}
              type="button"
            >
              <span className="immersive-enter-btn__icon" aria-hidden="true" />
              Immersive
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
                <span className="immersive-hud__label">{focalRoom.name}</span>
                <span className="immersive-hud__status">
                  {status === "sdk-connected" ? "SDK" : "Iframe"}
                </span>
              </div>
              <div className="immersive-hud__bottom">
                <span className="immersive-hud__hint">WASD — Move</span>
                <span className="immersive-hud__hint">Space — Interact</span>
                <span className="immersive-hud__hint">ESC — Exit</span>
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
          objects={space.objects}
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
