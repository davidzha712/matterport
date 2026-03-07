import type { SpaceRecord } from "@/lib/mock-data"

export function CommandBar({ space }: { space: SpaceRecord }) {
  return (
    <section aria-label="AI command bar" className="command-bar">
      <label className="sr-only" htmlFor="command-bar-input">
        Issue a space command
      </label>
      <input
        aria-describedby="command-bar-help"
        defaultValue={`Show me high-priority objects in ${space.name}`}
        id="command-bar-input"
        name="command"
        type="text"
      />
      <p className="command-bar__help" id="command-bar-help">
        Try commands like “summarize this room”, “show donation candidates”, or “open the study
        collection”.
      </p>
    </section>
  )
}

