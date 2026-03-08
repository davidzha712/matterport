import Link from "next/link"
import { getRuntimeProjects } from "@/lib/platform-service"
import { buildSpaceRoute } from "@/lib/routes"
import { getMatterportEmbedUrl } from "@/lib/matterport"
import { LocaleSwitcher } from "@/components/locale-switcher"

export default async function HomePage() {
  const projects = await getRuntimeProjects()
  const allSpaces = projects.flatMap((p) => p.spaces)
  const featuredSpace = allSpaces.find((s) => s.matterportModelSid) ?? allSpaces[0]

  return (
    <main className="landing" id="main-content">
      {/* Full-screen hero with Matterport embed background */}
      <section className="landing__hero">
        {featuredSpace?.matterportModelSid ? (
          <iframe
            allow="fullscreen; xr-spatial-tracking"
            className="landing__hero-embed"
            loading="eager"
            referrerPolicy="strict-origin-when-cross-origin"
            src={getMatterportEmbedUrl(featuredSpace.matterportModelSid)}
            title={featuredSpace.name}
          />
        ) : (
          <div className="landing__hero-visual" />
        )}
        <div className="landing__hero-veil" aria-hidden="true" />

        <header className="landing__topbar">
          <span className="landing__logo">Matterport</span>
          <nav className="landing__nav">
            {featuredSpace ? (
              <Link className="landing__nav-link" href={buildSpaceRoute(featuredSpace.id)}>
                Explore
              </Link>
            ) : null}
            <Link className="landing__nav-link" href="/studio">
              Studio
            </Link>
            <LocaleSwitcher />
          </nav>
        </header>

        <div className="landing__hero-content">
          <p className="landing__eyebrow">Immersive Digital Twin</p>
          <h1 className="landing__headline">
            Raeume werden zu Wissensbuehnen.
          </h1>
          <p className="landing__subline">
            Begehbare 3D-Raeume mit KI-gestuetzter Objekterkennung und Nachlassverwaltung.
          </p>
          {featuredSpace ? (
            <Link className="landing__cta" href={buildSpaceRoute(featuredSpace.id)}>
              Space betreten
            </Link>
          ) : null}
        </div>

        <div className="landing__scroll-hint" aria-hidden="true">
          <span>Scroll</span>
          <div className="landing__scroll-line" />
        </div>
      </section>

      {/* Space gallery */}
      {allSpaces.length > 0 ? (
        <section className="landing__gallery">
          <h2 className="landing__section-title">Digitale Raeume</h2>
          <div className="landing__grid">
            {allSpaces.map((space) => (
              <Link
                className="space-card"
                href={buildSpaceRoute(space.id)}
                key={space.id}
              >
                <div className="space-card__visual">
                  {space.matterportModelSid ? (
                    <iframe
                      className="space-card__embed"
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                      src={`https://my.matterport.com/show/?m=${space.matterportModelSid}&play=1&qs=1&brand=0&title=0&help=0&gt=0&hr=0&mls=2&mt=0`}
                      title={space.name}
                    />
                  ) : (
                    <div className="space-card__placeholder" />
                  )}
                  <div className="space-card__overlay" />
                </div>
                <div className="space-card__info">
                  <span className="space-card__project">{space.projectName}</span>
                  <h3 className="space-card__title">{space.name}</h3>
                  <p className="space-card__summary">{space.summary}</p>
                  <div className="space-card__meta">
                    <span>{space.rooms.length} Raeume</span>
                    <span>{space.objects.length} Objekte</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Minimal footer */}
      <footer className="landing__footer">
        <span>Matterport Immersive Platform</span>
        <div className="landing__footer-links">
          <Link href="/studio">Studio</Link>
          <Link href="/review-center">Review</Link>
          <Link href="/export-center">Export</Link>
        </div>
      </footer>
    </main>
  )
}
