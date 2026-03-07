import Link from "next/link"
import { CommandBar } from "@/components/command-bar"
import { ContextPanel } from "@/components/context-panel"
import { MatterportStage } from "@/components/matterport-stage"
import { ModeRail } from "@/components/mode-rail"
import type { ObjectRecord, RoomRecord, SpaceRecord } from "@/lib/mock-data"
import { buildSpaceRoute } from "@/lib/routes"
import type { StageMode } from "@/lib/routes"

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
  return (
    <main className="immersive-shell" id="main-content">
      <header className="immersive-topbar">
        <div className="immersive-topbar__brand">
          <p className="eyebrow">Immersive knowledge spaces</p>
          <h1>{space.projectName}</h1>
        </div>
        <nav aria-label="Global">
          <ul className="inline-nav">
            <li>
              <Link href="/">Portfolio</Link>
            </li>
            <li>
              <Link href="/settings/providers">Providers</Link>
            </li>
            <li>
              <Link href={buildSpaceRoute(space.id, "review")}>Review queue</Link>
            </li>
          </ul>
        </nav>
      </header>

      <div className="immersive-grid">
        <section className="immersive-main">
          <div className="context-banner">
            <div>
              <p className="eyebrow">Current space</p>
              <h2>{space.name}</h2>
            </div>
            <p>{space.summary}</p>
          </div>
          <CommandBar space={space} />
          <MatterportStage space={space} />
          <ModeRail currentMode={focusMode} spaceId={space.id} />
        </section>
        <ContextPanel selectedObject={selectedObject} selectedRoom={selectedRoom} space={space} />
      </div>
    </main>
  )
}

