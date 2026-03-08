import { cn } from "@/lib/utils"
import { Eyebrow } from "./eyebrow"

type SectionHeaderProps = React.ComponentProps<"div"> & {
  eyebrow: string
  title: string
  description?: string
}

export function SectionHeader({ className, eyebrow, title, description, ...props }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--text)]">{title}</h2>
      {description ? <p className="max-w-xl text-sm leading-relaxed text-[var(--text-muted)]">{description}</p> : null}
    </div>
  )
}
