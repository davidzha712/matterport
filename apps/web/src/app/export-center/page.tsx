import Link from "next/link"
import { getRuntimeProjects } from "@/lib/platform-service"
import { getBrowserApiBaseUrl } from "@/lib/browser-api"

export default async function ExportCenterPage() {
  const projects = await getRuntimeProjects()

  return (
    <main className="detail-shell" id="main-content">
      <header className="detail-header">
        <div>
          <p className="eyebrow">Export Center</p>
          <h1>Datenbereitstellung und Archivierung.</h1>
          <p>Exportieren Sie Inventare, Zustandsberichte und kuratorische Dossiers in standardisierte Formate.</p>
        </div>
        <div className="detail-header__actions">
          <Link className="button button--secondary" href="/">
            Zur Uebersicht
          </Link>
        </div>
      </header>

      <section className="section-grid">
        <div className="section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Bulk Actions</p>
              <h2>Globaler Export</h2>
            </div>
          </div>
          <p>Laden Sie das gesamte Inventar aller Projekte als eine konsolidierte CSV-Datei herunter.</p>
          <div className="action-matrix">
            <a 
              className="button button--primary" 
              href={`${getBrowserApiBaseUrl()}/export/all/csv`}
              download
            >
              Alle Objekte (CSV)
            </a>
          </div>
        </div>

        <aside className="section-card section-card--narrow">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Standards</p>
              <h2>Formate</h2>
            </div>
          </div>
          <ul className="context-list">
            <li><strong>CSV:</strong> Standard-Tabellenformat fuer Excel/Numbers.</li>
            <li><strong>PDF:</strong> (Geplant) Druckfertige Dossiers mit Bildern.</li>
            <li><strong>IIIF:</strong> (Geplant) Manifest-Export fuer Museen.</li>
          </ul>
        </aside>
      </section>

      <section className="section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Projektbasiert</p>
            <h2>Nach Projekt und Space exportieren</h2>
          </div>
        </div>
        
        <div className="project-grid">
          {projects.map((project) => (
            <div key={project.id} className="project-card export-project-card">
              <h3>{project.name}</h3>
              <ul className="export-space-list">
                {project.spaces.map((space) => (
                  <li key={space.id}>
                    <span>{space.name}</span>
                    <a 
                      className="pill pill--active" 
                      href={`${getBrowserApiBaseUrl()}/export/spaces/${space.id}/csv`}
                      download
                    >
                      CSV
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
