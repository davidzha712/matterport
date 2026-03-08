import { cn } from "@/lib/utils"

type MetricCardProps = React.ComponentProps<"div"> & {
  label: string
  value: string | number
  detail?: string
}

export function MetricCard({ className, label, value, detail, ...props }: MetricCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4",
        className
      )}
      {...props}
    >
      <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
      <strong className="font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums text-[var(--text)]">{value}</strong>
      {detail ? <p className="text-xs text-[var(--text-muted)]">{detail}</p> : null}
    </div>
  )
}
