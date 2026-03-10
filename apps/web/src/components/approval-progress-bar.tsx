"use client"

import { useT } from "@/lib/i18n"

type ApprovalProgressBarProps = {
  reviewed: number
  total: number
}

export function ApprovalProgressBar({ reviewed, total }: ApprovalProgressBarProps) {
  const t = useT()
  const pct = total > 0 ? Math.round((reviewed / total) * 100) : 0

  return (
    <div className="approval-progress-bar" aria-label={t.reviewMode.approvalProgress}>
      <span className="approval-progress-bar__label">{reviewed}/{total}</span>
      <div className="approval-progress-bar__track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="approval-progress-bar__fill" style={{ width: `${pct}%` }} />
      </div>
      <span>{t.reviewMode.reviewed}</span>
    </div>
  )
}
