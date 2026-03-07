import Link from "next/link"
import type { ProjectRecord } from "@/lib/mock-data"
import { toToneToken } from "@/lib/presentation"
import { buildSpaceRoute } from "@/lib/routes"

export function ProjectOverviewCard({ project }: { project: ProjectRecord }) {
  const primarySpace = project.spaces[0]

  return (
    <article className="project-card">
      <header className="project-card__header">
        <div>
          <p className="eyebrow">{project.vertical}</p>
          <h3>{project.name}</h3>
        </div>
        <span className={`pill pill--${toToneToken(project.status)}`}>{project.status}</span>
      </header>
      <p>{project.summary}</p>
      <dl className="project-card__facts">
        <div>
          <dt>Spaces</dt>
          <dd>{project.spaces.length}</dd>
        </div>
        <div>
          <dt>Objects tracked</dt>
          <dd>
            {project.spaces.reduce((total, space) => total + space.objects.length, 0)}
          </dd>
        </div>
      </dl>
      {primarySpace ? (
        <Link className="primary-link" href={buildSpaceRoute(primarySpace.id)}>
          Explore {primarySpace.name}
        </Link>
      ) : null}
    </article>
  )
}
