# Stage Mode UI Differentiation Plan

## Overview

5 modes, each with distinct visual language and interaction paradigm.
Phase 1: explore + work (implementing now). Phase 2: story, review, listing.

---

## Phase 1 (Current Sprint)

### MODE 1: EXPLORE (Erkunden) — Discovery Walkthrough

**Design:** 3D viewport dominates. UI is gossamer-thin, translucent, gets out of the way.

| Aspect | Spec |
|--------|------|
| 3D viewport | ~65% visible |
| Left panel | 26rem, translucent (45% opacity), backdrop-blur |
| Right panel | 22rem, translucent, collapsible |
| Topbar | Minimal: space name + mode only, no full nav |
| Toolbar | Floating pill, translucent |
| Bottom chrome | Translucent, lightweight |

**Unique elements:**
- Discovery Pulse: subtle CSS animation, stage border pulses blue every 8s
- Room Transition Chip: floating pill shows new room name for 3s on room change
- Translucent everything: panels, cards, toolbar all use `backdrop-filter: blur`
- Blue-tinted soft vignette

---

### MODE 2: WORK (Inventar) — Professional Workspace

**Design:** Like a CAD/GIS app. Dense, opaque, information-rich. 3D is a working canvas.

| Aspect | Spec |
|--------|------|
| 3D viewport | ~45-50% |
| Left panel | 30rem, fully opaque, sharp borders |
| Right panel | 26rem, fully opaque |
| Topbar | Full nav + breadcrumbs |
| Toolbar | Opaque, professional |
| Bottom chrome | Opaque with border |

**Unique elements:**
- Status Bar: 32px bar at top — SDK status, room name, object count, mode
- Object Counter Badge: floating pill at bottom center — "N objects"
- Visible Grid: subtle measurement grid overlay on 3D stage
- No decorative effects: no vignette, no atmosphere, no animations

---

## Phase 2 (Planned)

### MODE 3: STORY (Erzahlen) — Cinematic Narrative

**Design:** Full-screen cinematic. All chrome recedes. Documentary feel.

| Aspect | Spec |
|--------|------|
| 3D viewport | 80-90%, immersive |
| Left panel | 20rem, lower-left, narrative only |
| Right panel | Hidden by default |
| Topbar | **Hidden** entirely |
| Bottom | Filmstrip: horizontal scrollable room strip |
| Atmosphere | Dramatic vignette, letterboxing (40px black bars) |

**Unique elements (planned):**
- Cinematic letterboxing (black bars top/bottom)
- Large serif narrative text overlays
- Auto-advance progress bar during tours
- Filmstrip room navigation
- "Tell me about this" floating button replaces CommandBar

**Implementation notes:**
- Topbar: `topbarVariant: "hidden"` (already wired)
- Need new `<FilmstripNav>` component for bottom
- Narrative overlay with serif typography
- Letterbox via CSS pseudo-elements on stage-shell

---

### MODE 4: REVIEW (Prufen) — Audit Interface

**Design:** Split-screen QA dashboard. Dense data tables, checklists, approval flows.

| Aspect | Spec |
|--------|------|
| 3D viewport | 50% left half |
| Right panel | 50% right half, full-height scrollable |
| Left panel | Hidden (intro card moves to right panel header) |
| Topbar | Full + approval progress bar |
| Toolbar | Vertical strip on left edge |
| Bottom | Minimal: mode rail only |
| Atmosphere | Amber/orange accents, no decorative effects |

**Unique elements (planned):**
- Approval Progress Bar in topbar: `reviewed / total` with fill
- Vertical toolbar strip on left edge
- Side-by-side object comparison in right panel
- Room checklist indicators (green checks on fully-reviewed rooms)
- Audit timestamp on every card

**Implementation notes:**
- Major layout change: CSS grid 50/50 split
- Need `<ApprovalProgressBar>` component
- VerticalToolbar variant of StageToolbar
- Comparison mode in ContextPanel

---

### MODE 5: LISTING (Listing Prep) — Sales Showcase

**Design:** Real estate marketing preview. Polished, magazine-quality.

| Aspect | Spec |
|--------|------|
| 3D viewport | 70%, with premium rounded border |
| Left panel | 24rem, property highlights + pricing |
| Right panel | Hidden, via floating "Details" button |
| Topbar | Minimal + "Share" CTA button |
| Bottom | Showcase: room gallery cards |
| Atmosphere | Rose/coral accent, warm premium glow, subtle grain |

**Unique elements (planned):**
- Property Highlights Card: sqm, room count, estimated value range
- Share Button: floating CTA for generating shareable links
- Gallery filmstrip with room snapshots at bottom
- Premium Frame: 2px golden/rose border with rounded corners on 3D viewport
- Total collection value badge

**Implementation notes:**
- IntroCard variant `sell-focused` needs expansion: real metrics, not just a badge
- Need `<ShareButton>` component
- Gallery bottom bar similar to story filmstrip but card-styled
- Premium viewport border via CSS

---

## Architecture

All modes share `ImmersiveShell`. Differentiation via:
1. `StageModeConfig` — extended with `topbarVariant`, `showGlobalNav`, `showBreadcrumbs`
2. Conditional JSX in `immersive-shell.tsx` — mode-specific elements
3. CSS scoped to `[data-stage-mode="..."]` — visual treatment

No new files needed for Phase 1. Phase 2 may require:
- `components/filmstrip-nav.tsx` (story + listing)
- `components/approval-progress-bar.tsx` (review)
- `components/share-button.tsx` (listing)

## File Change Summary

### Phase 1 (now)
| File | Changes |
|------|---------|
| `stage-mode-config.ts` | +3 fields, +1 type |
| `immersive-shell.tsx` | +status bar, +room chip, +object counter, conditional nav |
| `globals.css` | +~250 lines mode-scoped CSS |

### Phase 2 (later)
| File | Changes |
|------|---------|
| `globals.css` | +~200 lines for story/review/listing |
| `immersive-shell.tsx` | +letterbox, +progress bar, +share btn |
| New: `filmstrip-nav.tsx` | Story/listing bottom navigation |
| New: `approval-progress-bar.tsx` | Review mode topbar widget |
| New: `share-button.tsx` | Listing mode CTA |
