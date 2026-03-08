import { cn } from "@/lib/utils"

export function Eyebrow({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "font-[family-name:var(--font-display)] text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent-gold)]",
        className
      )}
      {...props}
    />
  )
}
