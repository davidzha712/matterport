"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Eyebrow, GlassPanel, MetricCard } from "@/components/gallery"
import type { SpaceRecord } from "@/lib/platform-types"
import { buildSpaceRoute } from "@/lib/routes"
import { useT } from "@/lib/i18n"

type HeroSceneProps = {
  featuredSpace?: SpaceRecord
  projectCount: number
  providerCount: number
  reviewCount: number
  spaceCount: number
  totalObjects: number
}

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.3 }
  }
}

const revealUp = {
  hidden: { opacity: 0, y: 40, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring" as const, stiffness: 200, damping: 24 }
  }
}

const revealScale = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 200, damping: 26 }
  }
}

export function HeroScene({
  featuredSpace,
  projectCount,
  providerCount,
  reviewCount,
  spaceCount,
  totalObjects
}: HeroSceneProps) {
  const t = useT()
  return (
    <section className="noise vignette relative flex min-h-svh items-end overflow-hidden px-6 pb-12 pt-24 lg:px-12 lg:pb-16 lg:pt-32">
      {/* Layered background */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071019] via-[#09131d] to-[#050c14]" />
        <div className="absolute inset-0 animate-gradient-shift bg-[radial-gradient(ellipse_at_18%_22%,rgba(234,211,142,0.2),transparent_45%),radial-gradient(ellipse_at_85%_12%,rgba(71,134,162,0.18),transparent_40%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[var(--bg)] to-transparent" />
      </div>

      <motion.div
        className="relative z-10 mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[1fr_400px]"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        {/* Left: Copy */}
        <div className="flex flex-col justify-end gap-6">
          <motion.div variants={revealUp}>
            <Eyebrow>{t.hero.eyebrow}</Eyebrow>
          </motion.div>

          <motion.h1
            className="max-w-[12ch] font-[family-name:var(--font-display)] text-[clamp(2.4rem,5vw,5rem)] font-semibold leading-[0.95] tracking-tight"
            variants={revealUp}
          >
            {t.hero.headline}
          </motion.h1>

          <motion.h2
            className="max-w-[22ch] font-[family-name:var(--font-display)] text-[clamp(1.2rem,2.2vw,2rem)] font-normal leading-tight text-[var(--text-muted)]"
            variants={revealUp}
          >
            {t.hero.subheadline}
          </motion.h2>

          <motion.p
            className="max-w-xl text-sm leading-relaxed text-[var(--text-muted)]"
            variants={revealUp}
          >
            {t.hero.body}
          </motion.p>

          <motion.div className="flex flex-wrap gap-3" variants={revealUp}>
            {featuredSpace ? (
              <Button render={<Link href={buildSpaceRoute(featuredSpace.id)} />}>
                {t.hero.enterDigitalTwin}
              </Button>
            ) : null}
            <Button variant="outline" render={<Link href="/review-center" />}>
              {t.hero.reviewCenter}
            </Button>
            <Button variant="outline" render={<Link href="/export-center" />}>
              {t.hero.exportCenter}
            </Button>
            <Button variant="ghost" render={<Link href="/settings/providers" />}>
              {t.hero.provider}
            </Button>
          </motion.div>

          {/* Feature cards */}
          <motion.div
            className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            variants={stagger}
          >
            {[
              { eyebrow: t.hero.featureStageEyebrow, title: t.hero.featureStageTitle, body: t.hero.featureStageBody },
              { eyebrow: t.hero.featureAiEyebrow, title: t.hero.featureAiTitle, body: t.hero.featureAiBody },
              { eyebrow: t.hero.featureWorkflowEyebrow, title: t.hero.featureWorkflowTitle, body: t.hero.featureWorkflowBody },
              { eyebrow: t.hero.featureControlEyebrow, title: t.hero.featureControlTitle, body: t.hero.featureControlBody }
            ].map((card) => (
              <motion.div
                key={card.eyebrow}
                className="glow-card rounded-xl border border-white/[0.06] bg-white/[0.03] p-4"
                variants={revealScale}
              >
                <Eyebrow>{card.eyebrow}</Eyebrow>
                <h3 className="mt-1 font-[family-name:var(--font-display)] text-base font-semibold">
                  {card.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
                  {card.body}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Right: Metrics + Featured space */}
        <motion.div
          className="flex flex-col justify-end gap-4"
          variants={stagger}
        >
          <motion.div className="grid grid-cols-2 gap-3" variants={stagger}>
            <motion.div variants={revealScale}>
              <MetricCard label={t.common.projects} value={projectCount} />
            </motion.div>
            <motion.div variants={revealScale}>
              <MetricCard label={t.common.spaces} value={spaceCount} />
            </motion.div>
            <motion.div variants={revealScale}>
              <MetricCard label={t.workflowSidebar.reviewQueue} value={reviewCount} />
            </motion.div>
            <motion.div variants={revealScale}>
              <MetricCard label={t.common.objects} value={totalObjects} className="col-span-2" />
            </motion.div>
          </motion.div>

          {featuredSpace ? (
            <motion.div variants={revealScale}>
              <GlassPanel className="animate-glow-border flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <Eyebrow>{t.hero.activeStage}</Eyebrow>
                    <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                      {featuredSpace.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="live-dot" />
                    <Badge>{t.hero.live}</Badge>
                  </div>
                </div>
                <p className="text-sm text-[var(--text-muted)]">{featuredSpace.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {[t.modes.explore, t.modes.story, t.modes.review, t.modes.listing].map((chip) => (
                    <Badge key={chip} variant="secondary">{chip}</Badge>
                  ))}
                </div>
                <Separator className="bg-white/[0.06]" />
                <ul className="flex flex-col gap-2 list-none p-0">
                  {featuredSpace.rooms.slice(0, 3).map((room) => (
                    <li key={room.id} className="flex items-center justify-between text-sm">
                      <strong className="text-[var(--text)]">{room.name}</strong>
                      <span className="text-xs text-[var(--text-muted)]">{room.objectIds.length} {t.common.objects}</span>
                    </li>
                  ))}
                </ul>
              </GlassPanel>
            </motion.div>
          ) : null}

          <motion.div
            className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]"
            variants={revealUp}
          >
            <span>{t.providers.configuredCount.replace("{count}", String(providerCount))}</span>
            <span className="text-white/20">·</span>
            <span>{t.providers.serverSideOnly}</span>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
      >
        <div className="animate-float flex flex-col items-center gap-1">
          <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{t.hero.scrollHint}</span>
          <div className="h-8 w-[1px] bg-gradient-to-b from-[var(--accent-gold)] to-transparent" />
        </div>
      </motion.div>
    </section>
  )
}
