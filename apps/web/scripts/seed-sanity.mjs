#!/usr/bin/env node
/**
 * Seed Sanity with all mock data.
 *
 * Usage:
 *   node apps/web/scripts/seed-sanity.mjs
 *
 * Requires SANITY_API_WRITE_TOKEN, NEXT_PUBLIC_SANITY_PROJECT_ID in .env.local
 */

import { createClient } from "@sanity/client"
import { config } from "dotenv"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, "../.env.local") })

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
const token = process.env.SANITY_API_WRITE_TOKEN

if (!projectId || !token) {
  console.error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_API_WRITE_TOKEN in .env.local")
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: "2024-01-01",
  useCdn: false,
})

const primaryLiveModelSid = process.env.NEXT_PUBLIC_MATTERPORT_MODEL_SID ?? "oyaicKWaEQw"

// ── Deterministic IDs (so re-runs are idempotent) ─────────────────────────

const IDS = {
  // Projects
  projectOrchard: "spaceProject-estate-orchard",
  projectLantern: "spaceProject-museum-lantern",
  // Spaces
  spaceMainHouse: "spaceRecord-orchard-main-house",
  spaceGallery: "spaceRecord-lantern-gallery",
  // Rooms
  roomLivingRoom: "roomRecord-living-room",
  roomStudy: "roomRecord-study",
  roomIntroHall: "roomRecord-intro-hall",
  // Objects
  objWalnutCabinet: "objectRecord-walnut-cabinet",
  objMantelClock: "objectRecord-mantel-clock",
  objAtlasDesk: "objectRecord-atlas-desk",
  objArchiveBox: "objectRecord-archive-box",
  objBrassLantern: "objectRecord-brass-lantern",
  objVisitorMap: "objectRecord-visitor-map",
  // Providers
  provOpenai: "aiProvider-openai",
  provQwen: "aiProvider-qwen",
  provKimi: "aiProvider-kimi",
  provMinimax: "aiProvider-minimax",
}

const ref = (id) => ({ _type: "reference", _ref: id })

// ── Documents ─────────────────────────────────────────────────────────────

const documents = [
  // ── Projects ──
  {
    _id: IDS.projectOrchard,
    _type: "spaceProject",
    projectId: "estate-orchard",
    title: "Orchard Estate Review",
    slug: { _type: "slug", current: "estate-orchard" },
    vertical: "estate",
    status: "Active",
    summary:
      "Mehrgeschossiger Nachlass-Workflow fuer Behalten, Verkaufen, Spenden und Archivieren in klaren Review-Stufen.",
  },
  {
    _id: IDS.projectLantern,
    _type: "spaceProject",
    projectId: "museum-lantern",
    title: "Lantern House Digital Exhibition",
    slug: { _type: "slug", current: "museum-lantern" },
    vertical: "museum",
    status: "Pilot",
    summary:
      "Museumsartige Erzaehlung mit Fuehrungen, Sammlungsmetadaten und Objektkarten ueber einem digitalen Zwilling.",
  },

  // ── Spaces ──
  {
    _id: IDS.spaceMainHouse,
    _type: "spaceRecord",
    spaceId: "orchard-main-house",
    title: "Main House",
    project: ref(IDS.projectOrchard),
    matterportModelSid: primaryLiveModelSid,
    mode: "estate",
    summary:
      "Grosser Wohnrundgang mit Moebeln, Archivmaterialien und dispositionsrelevanten Objekten ueber mehrere Raeumlichkeiten.",
    sortOrder: 10,
  },
  {
    _id: IDS.spaceGallery,
    _type: "spaceRecord",
    spaceId: "lantern-gallery",
    title: "North Gallery",
    project: ref(IDS.projectLantern),
    mode: "museum",
    summary:
      "Kuratiertes Galerieumfeld fuer Story-Modus, Objektmetadaten und spaetere Deep-Zoom-Detailansichten.",
    sortOrder: 20,
  },

  // ── Rooms ──
  {
    _id: IDS.roomLivingRoom,
    _type: "roomRecord",
    roomId: "living-room",
    title: "Living Room",
    space: ref(IDS.spaceMainHouse),
    priorityBand: "High",
    recommendation:
      "Disposition bestaetigen und fuer wertige Objekte detailliertere Aufnahmen sichern.",
    summary:
      "Dichter Raum mit wahrscheinlich wertigen Moebeln und gemischten sentimentalen Objekten.",
    sortOrder: 10,
  },
  {
    _id: IDS.roomStudy,
    _type: "roomRecord",
    roomId: "study",
    title: "Study",
    space: ref(IDS.spaceMainHouse),
    priorityBand: "Medium",
    recommendation:
      "Papierbestaende vor jeder Aussonderung archivisch pruefen.",
    summary:
      "Papierlastiger Raum mit Unterlagen, Regalen und einem zentralen Schreibtischcluster.",
    sortOrder: 20,
  },
  {
    _id: IDS.roomIntroHall,
    _type: "roomRecord",
    roomId: "intro-hall",
    title: "Intro Hall",
    space: ref(IDS.spaceGallery),
    priorityBand: "Low",
    recommendation:
      "Nach finaler Pruefung der Beschriftung bereit fuer den oeffentlichen Story-Modus.",
    summary:
      "Einfuehrender Schwellenraum, der die gefuehrte Erzaehlung verankert.",
    sortOrder: 10,
  },

  // ── Objects ──
  {
    _id: IDS.objWalnutCabinet,
    _type: "objectRecord",
    objectId: "walnut-cabinet",
    title: "Walnut Cabinet",
    space: ref(IDS.spaceMainHouse),
    room: ref(IDS.roomLivingRoom),
    objectType: "Furniture",
    status: "Needs Review",
    disposition: "Sell",
    aiSummary:
      "Wahrscheinlich ein Aufbewahrungsschrank des fruehen 20. Jahrhunderts mit intakter Verbindungstechnik und gutem Wiederverkaufspotenzial nach Zustandspruefung.",
    sortOrder: 10,
  },
  {
    _id: IDS.objMantelClock,
    _type: "objectRecord",
    objectId: "mantel-clock",
    title: "Mantel Clock",
    space: ref(IDS.spaceMainHouse),
    room: ref(IDS.roomLivingRoom),
    objectType: "Decor",
    status: "Reviewed",
    disposition: "Keep",
    aiSummary:
      "Die Kaminuhr wirkt dekorativ und moeglicherweise emotional bedeutsam; vor jeder Entscheidung wird ein Provenienzgespraech empfohlen.",
    sortOrder: 20,
  },
  {
    _id: IDS.objAtlasDesk,
    _type: "objectRecord",
    objectId: "atlas-desk",
    title: "Atlas Desk",
    space: ref(IDS.spaceMainHouse),
    room: ref(IDS.roomStudy),
    objectType: "Furniture",
    status: "Needs Review",
    disposition: "Archive",
    aiSummary:
      "Der grosse Schreibtisch mit Papieren und Schubladen deutet auf einen kombinierten Archiv- und Verwertungsprozess hin und verlangt eine zweigleisige Behandlung.",
    sortOrder: 30,
  },
  {
    _id: IDS.objArchiveBox,
    _type: "objectRecord",
    objectId: "archive-box",
    title: "Archive Box",
    space: ref(IDS.spaceMainHouse),
    room: ref(IDS.roomStudy),
    objectType: "Document Set",
    status: "Approved",
    disposition: "Archive",
    aiSummary:
      "Briefe und Dokumente in Boxen sollten im Archivstatus bleiben, bis Digitalisierung oder familiaere Sichtung abgeschlossen sind.",
    sortOrder: 40,
  },
  {
    _id: IDS.objBrassLantern,
    _type: "objectRecord",
    objectId: "brass-lantern",
    title: "Brass Lantern",
    space: ref(IDS.spaceGallery),
    room: ref(IDS.roomIntroHall),
    objectType: "Object",
    status: "Reviewed",
    disposition: "Keep",
    aiSummary:
      "Interpretatives Objekt mit starkem Erzaehlwert; ideal in Kombination mit hochaufgeloesten Bildkacheln und Konservierungsnotizen.",
    sortOrder: 10,
  },
  {
    _id: IDS.objVisitorMap,
    _type: "objectRecord",
    objectId: "visitor-map",
    title: "Visitor Map",
    space: ref(IDS.spaceGallery),
    room: ref(IDS.roomIntroHall),
    objectType: "Interpretive Graphic",
    status: "Approved",
    disposition: "Keep",
    aiSummary:
      "Die Besucherkarte unterstuetzt die Orientierung und sollte aus dem rechten Kontextpanel verlinkt, nicht direkt in die Stage eingebettet werden.",
    sortOrder: 20,
  },

  // ── AI Provider Profiles ──
  {
    _id: IDS.provOpenai,
    _type: "aiProviderProfile",
    providerId: "openai",
    title: "OpenAI GPT",
    status: "Needs Review",
    preferredFor: [
      "tool orchestration",
      "multimodal coordination",
      "final user responses",
    ],
    configured: false,
    specialty: "Stark in Reasoning und Workflow-Orchestrierung",
    fallbackClass: "premium-generalist",
  },
  {
    _id: IDS.provQwen,
    _type: "aiProviderProfile",
    providerId: "qwen",
    title: "Qwen",
    status: "Pilot",
    preferredFor: [
      "Self-Hosting-Strategie",
      "visuelle Analyse",
      "unternehmensweite Kostenkontrolle",
    ],
    configured: false,
    specialty: "Kostensensible multimodale Analyse",
    fallbackClass: "vision-economy",
  },
  {
    _id: IDS.provKimi,
    _type: "aiProviderProfile",
    providerId: "kimi",
    title: "Kimi",
    status: "Pilot",
    preferredFor: [
      "lange Kontexte",
      "agentische Dokumentpruefung",
      "mehrstufige Narrativbildung",
    ],
    configured: false,
    specialty: "Langkontextuelle multimodale Analyse",
    fallbackClass: "long-context",
  },
  {
    _id: IDS.provMinimax,
    _type: "aiProviderProfile",
    providerId: "minimax",
    title: "MiniMax",
    status: "Needs Review",
    preferredFor: [
      "Sprache",
      "Video",
      "breite Modalitaetsabdeckung",
    ],
    configured: false,
    specialty: "Audio- und Medienerweiterung",
    fallbackClass: "media-extended",
  },
]

// ── Execute ───────────────────────────────────────────────────────────────

async function seed() {
  console.log(`Seeding ${documents.length} documents into ${projectId}/${dataset}...`)

  const transaction = client.transaction()

  for (const doc of documents) {
    transaction.createOrReplace(doc)
  }

  const result = await transaction.commit()
  console.log(`Done. Transaction ID: ${result.transactionId}`)
  console.log(`  ${result.documentIds.length} documents written.`)
  console.log()
  console.log("Studio URL: http://localhost:3000/studio")
}

seed().catch((err) => {
  console.error("Seed failed:", err.message)
  process.exit(1)
})
