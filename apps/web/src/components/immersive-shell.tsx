"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { CommandBar } from "@/components/command-bar"
import { ContextPanel } from "@/components/context-panel"
import { MatterportStage } from "@/components/matterport-stage"
import { ModeRail } from "@/components/mode-rail"
import type { ObjectRecord, RoomRecord, SpaceRecord } from "@/lib/mock-data"
import { buildSpaceRoute } from "@/lib/routes"
import { stageModeLabels, type StageMode } from "@/lib/routes"

type ImmersiveShellProps = {
  focusMode: StageMode
  selectedObject?: ObjectRecord
  selectedRoom?: RoomRecord
  space: SpaceRecord
}

export function ImmersiveShell({
  focusMode,
  selectedObject,
  selectedRoom,
  space
}: ImmersiveShellProps) {
  const reduceMotion = useReducedMotion()
  const focalRoom = selectedRoom ?? space.rooms[0]
  const focalObject = selectedObject ?? space.objects[0]
  const enterFromTop = reduceMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }
  const enterFromLeft = reduceMotion ? { opacity: 1, x: 0 } : { opacity: 1, x: 0 }
  const enterFromBottom = reduceMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }
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
            <p className="eyebrow">Immersive Wissensräume</p>
            <h1>{space.projectName}</h1>
          </div>
          <nav aria-label="Global">
            <ul className="inline-nav">
              <li>
                <Link href="/">Uebersicht</Link>
              </li>
              <li>
                <Link href="/settings/providers">Provider</Link>
              </li>
              <li>
                <Link href={buildSpaceRoute(space.id, "review")}>Prüfzentrum</Link>
              </li>
              <li className="inline-nav__locale">DE / EN</li>
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
              <p className="eyebrow">Aktuelle Szene</p>
              <h2>{space.name}</h2>
            </div>
            <p>{space.summary}</p>
            <ul className="stage-intro-card__metrics">
              <li>{space.rooms.length} Räume erfasst</li>
              <li>{space.objects.length} Objekte verfolgt</li>
              <li>Modus: {stageModeLabels[focusMode]}</li>
            </ul>
            <div className="stage-highlight-rail">
              <div className="stage-highlight-card">
                <span>Objektfokus</span>
                <strong>{focalObject.title}</strong>
              </div>
              <div className="stage-highlight-card">
                <span>Raumkontext</span>
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
          <ContextPanel selectedObject={selectedObject} selectedRoom={selectedRoom} space={space} />
        </motion.aside>

        <motion.section
          animate={enterFromBottom}
          className="stage-room-strip"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          transition={{ ...immediateTransition, delay: reduceMotion ? 0 : 0.18 }}
        >
          {space.rooms.map((room) => (
            <Link className="room-chip" href={`/spaces/${space.id}/rooms/${room.id}`} key={room.id}>
              <span>{room.name}</span>
              <small>{room.objectIds.length} Objekte</small>
            </Link>
          ))}
        </motion.section>

        <motion.footer
          animate={enterFromBottom}
          className="stage-bottom-chrome"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          transition={{ ...immediateTransition, delay: reduceMotion ? 0 : 0.2 }}
        >
          <div className="stage-storyline">
            <div>
              <p className="eyebrow">Räumlicher Kontext</p>
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
