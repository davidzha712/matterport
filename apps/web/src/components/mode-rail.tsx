import Link from "next/link"
import clsx from "clsx"
import type { StageMode } from "@/lib/routes"
import { STAGE_MODES, buildSpaceRoute } from "@/lib/routes"

type ModeRailProps = {
  currentMode: StageMode
  spaceId: string
}

const labels: Record<StageMode, string> = {
  explore: "Explore",
  review: "Review",
  story: "Story",
  work: "Inventory"
}

export function ModeRail({ currentMode, spaceId }: ModeRailProps) {
  return (
    <nav aria-label="Space modes" className="mode-rail">
      {STAGE_MODES.map((mode) => (
        <Link
          aria-current={currentMode === mode ? "page" : undefined}
          key={mode}
          className={clsx("mode-rail__link", currentMode === mode && "mode-rail__link--active")}
          href={buildSpaceRoute(spaceId, mode)}
        >
          {labels[mode]}
        </Link>
      ))}
    </nav>
  )
}
