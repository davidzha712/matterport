import { cn } from "@/lib/utils"

export function GlassPanel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "glass relative overflow-hidden rounded-2xl",
        className
      )}
      {...props}
    />
  )
}
