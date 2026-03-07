import Link from "next/link"
import { ProjectOverviewCard } from "@/components/project-overview-card"
import { getProjects, getProviderProfiles } from "@/lib/mock-data"
import { toToneToken } from "@/lib/presentation"
import { buildSpaceRoute } from "@/lib/routes"

export default function HomePage() {
  const projects = getProjects()
  const providers = getProviderProfiles()
  const featuredSpace = projects[0]?.spaces[0]

  return (
    <main className="home-shell" id="main-content">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">AI-native immersive platform</p>
          <h1>Run many Matterport spaces inside one reusable operational shell.</h1>
          <p className="hero-copy__body">
            This framework is built for multiple estates, museums, or inventory programs. The
            space is the stage. Structured objects, AI routing, human review, and exports live
            above it.
          </p>
          <div className="hero-actions">
            {featuredSpace ? (
              <Link className="button button--primary" href={buildSpaceRoute(featuredSpace.id)}>
                Enter featured space
              </Link>
            ) : null}
            <Link className="button button--secondary" href="/settings/providers">
              Review provider setup
            </Link>
          </div>
        </div>
        <div className="hero-metrics" aria-label="Platform posture">
          <div className="metric-card">
            <span>Projects</span>
            <strong>{projects.length}</strong>
          </div>
          <div className="metric-card">
            <span>Spaces</span>
            <strong>{projects.reduce((total, project) => total + project.spaces.length, 0)}</strong>
          </div>
          <div className="metric-card">
            <span>Provider adapters</span>
            <strong>{providers.length}</strong>
          </div>
        </div>
      </section>

      <section className="section-grid">
        <div className="section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Portfolio</p>
              <h2>Projects</h2>
            </div>
            <p>Every project can contain multiple Matterport spaces and workflow rules.</p>
          </div>
          <div className="project-grid">
            {projects.map((project) => (
              <ProjectOverviewCard key={project.id} project={project} />
            ))}
          </div>
        </div>

        <aside className="section-card section-card--narrow">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Routing</p>
              <h2>Model policy baseline</h2>
            </div>
            <p>Providers stay server-side; the UI shows intent, not raw keys.</p>
          </div>
          <ul className="provider-list" aria-label="Configured providers">
            {providers.map((provider) => (
              <li key={provider.id} className="provider-list__item">
                <div>
                  <strong>{provider.label}</strong>
                  <p>{provider.specialty}</p>
                </div>
                <span className={`pill pill--${toToneToken(provider.status)}`}>{provider.status}</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </main>
  )
}
