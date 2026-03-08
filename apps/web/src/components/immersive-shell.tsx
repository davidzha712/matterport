"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { CommandBar } from "@/components/command-bar"
import { ContextPanel } from "@/components/context-panel"
import { MatterportStage } from "@/components/matterport-stage"
import { ModeRail } from "@/components/mode-rail"
import { StageControls } from "@/components/stage-controls"
import { StageToolbar } from "@/components/stage-toolbar"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { BridgeProvider, useBridge } from "@/lib/bridge-context"
import { useT } from "@/lib/i18n"
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
  const focalRoom = selectedRoom ?? space.rooms[0]
  const focalObject = selectedObject ?? space.objects[0]
  const enterFromTop = { opacity: 1, y: 0 }
  const enterFromLeft = { opacity: 1, x: 0 }
  const enterFromBottom = { opacity: 1, y: 0 }
  const immediateTransition = { duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] as const }

  return (
    <main className="immersive-shell immersive-shell--stage" id="main-content">
      <MatterportStage space={space}>
        <motion.header
          animate={enterFromTop}
          className="immersive-topbar immersive-topbar--floating"
          initial={reduceMotion ? false : { opacity: 0, y: -16 }}
          transition={immediateTransition}
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

        <motion.section
          animate={enterFromLeft}
          className="stage-command-cluster"
          initial={reduceMotion ? false : { opacity: 0, x: -24 }}
          transition={{ ...immediateTransition, delay: reduceMotion ? 0 : 0.08 }}
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

        <motion.aside
          animate={enterFromLeft}
          className="stage-context-slot"
          initial={reduceMotion ? false : { opacity: 0, x: 28 }}
          transition={{ ...immediateTransition, delay: reduceMotion ? 0 : 0.12 }}
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

        <motion.footer
          animate={enterFromBottom}
          className="stage-bottom-chrome"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          transition={{ ...immediateTransition, delay: reduceMotion ? 0 : 0.2 }}
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
      </MatterportStage>
    </main>
  )
}
