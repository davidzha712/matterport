"use client"

import Link from "next/link"
import clsx from "clsx"
import type { StageMode } from "@/lib/routes"
import { STAGE_MODES, buildSpaceRoute } from "@/lib/routes"
import { useT } from "@/lib/i18n"

type ModeRailProps = {
  currentMode: StageMode
  spaceId: string
}

export function ModeRail({ currentMode, spaceId }: ModeRailProps) {
  const t = useT()
  return (
    <nav aria-label={t.stage.mode} className="mode-rail">
      {STAGE_MODES.map((mode) => (
        <Link
          aria-current={currentMode === mode ? "page" : undefined}
          key={mode}
          className={clsx("mode-rail__link", currentMode === mode && "mode-rail__link--active")}
          href={buildSpaceRoute(spaceId, mode)}
        >
          {t.modes[mode as keyof typeof t.modes] ?? mode}
        </Link>
      ))}
    </nav>
  )
}
