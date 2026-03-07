import Link from "next/link"
import type { ProjectRecord } from "@/lib/mock-data"
import { toDisplayVertical, toDisplayWorkflowStatus, toToneToken } from "@/lib/presentation"
import { buildSpaceRoute } from "@/lib/routes"

export function ProjectOverviewCard({ project }: { project: ProjectRecord }) {
  const primarySpace = project.spaces[0]
  const objectCount = project.spaces.reduce((total, space) => total + space.objects.length, 0)

  return (
    <article className="project-card">
      <div className="project-card__glow" aria-hidden="true" />
      <header className="project-card__header">
        <div>
          <p className="eyebrow">{toDisplayVertical(project.vertical)}</p>
          <h3>{project.name}</h3>
        </div>
        <span className={`pill pill--${toToneToken(project.status)}`}>
          {toDisplayWorkflowStatus(project.status)}
        </span>
      </header>
      <p>{project.summary}</p>
      <dl className="project-card__facts">
        <div>
          <dt>Spaces</dt>
          <dd>{project.spaces.length}</dd>
        </div>
        <div>
          <dt>Objekte</dt>
          <dd>{objectCount}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{toDisplayWorkflowStatus(project.status)}</dd>
        </div>
      </dl>
      {primarySpace ? (
        <div className="project-card__space-preview">
          <strong>{primarySpace.name}</strong>
          <span>{primarySpace.rooms.length} Raeume, stage-first bereit</span>
        </div>
      ) : null}
      {primarySpace ? (
        <Link className="primary-link" href={buildSpaceRoute(primarySpace.id)}>
          Space betreten
        </Link>
      ) : null}
    </article>
  )
}
