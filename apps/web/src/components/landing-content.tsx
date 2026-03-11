"use client"

import Link from "next/link"
import { useT } from "@/lib/i18n"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { getMatterportPreviewUrl } from "@/lib/matterport"
import { buildSpaceRoute } from "@/lib/routes"
import type { ProjectRecord } from "@/lib/platform-types"

type LandingContentProps = {
  projects: ProjectRecord[]
}

export function LandingContent({ projects }: LandingContentProps) {
  const t = useT()
  const allSpaces = projects.flatMap((p) => p.spaces)
  const featuredSpace = allSpaces.find((s) => s.matterportModelSid) ?? allSpaces[0]

  return (
    <main className="landing" id="main-content">
      <section className="landing__hero">
        {featuredSpace?.matterportModelSid ? (
          <iframe
            allow="fullscreen; xr-spatial-tracking; accelerometer; gyroscope"
            className="landing__hero-embed"
            loading="eager"
            src={getMatterportPreviewUrl(featuredSpace.matterportModelSid)}
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
                {t.hero.explore}
              </Link>
            ) : null}
            <Link className="landing__nav-link" href="/studio">
              {t.hero.studio}
            </Link>
            <LocaleSwitcher />
          </nav>
        </header>

        <div className="landing__hero-content">
          <p className="landing__eyebrow">{t.hero.eyebrow}</p>
          <h1 className="landing__headline">{t.hero.headline}</h1>
          <p className="landing__subline">{t.hero.subheadline}</p>
          {featuredSpace ? (
            <Link className="landing__cta" href={buildSpaceRoute(featuredSpace.id)}>
              {t.hero.enterSpace}
            </Link>
          ) : null}
        </div>

        <div className="landing__scroll-hint" aria-hidden="true">
          <span>{t.hero.scrollHint}</span>
          <div className="landing__scroll-line" />
        </div>
      </section>

      {allSpaces.length > 0 ? (
        <section className="landing__gallery">
          <h2 className="landing__section-title">{t.hero.digitalSpaces}</h2>
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
                      allow="fullscreen; xr-spatial-tracking; accelerometer; gyroscope"
                      className="space-card__embed"
                      loading="lazy"
                      src={getMatterportPreviewUrl(space.matterportModelSid)}
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
                    <span>{space.rooms.length} {t.hero.roomCount}</span>
                    <span>{space.objects.length} {t.hero.objectCount}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="landing__footer">
        <span>{t.hero.platformTitle}</span>
        <div className="landing__footer-links">
          <Link href="/studio">{t.hero.studio}</Link>
          <Link href="/review-center">{t.stage.reviewCenter}</Link>
          <Link href="/export-center">{t.stage.export}</Link>
        </div>
      </footer>
    </main>
  )
}
