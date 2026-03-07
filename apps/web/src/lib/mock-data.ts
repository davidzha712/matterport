export type WorkflowStatus = "Active" | "Pilot" | "Needs Review"
export type ObjectStatus = "Reviewed" | "Needs Review" | "Approved"

export type ProviderProfile = {
  bestFor: string[]
  configured?: boolean
  fallbackClass: string
  id: string
  label: string
  specialty: string
  status: WorkflowStatus
}

export type ObjectRecord = {
  aiSummary: string
  disposition: "Keep" | "Sell" | "Donate" | "Archive"
  id: string
  roomId: string
  roomName: string
  status: ObjectStatus
  title: string
  type: string
}

export type RoomRecord = {
  id: string
  name: string
  objectIds: string[]
  pendingReviewCount: number
  priorityBand: "High" | "Medium" | "Low"
  recommendation: string
  summary: string
}

export type SpaceRecord = {
  id: string
  matterportModelSid?: string
  name: string
  objects: ObjectRecord[]
  projectId: string
  projectName: string
  rooms: RoomRecord[]
  summary: string
}

export type ProjectRecord = {
  id: string
  name: string
  spaces: SpaceRecord[]
  status: WorkflowStatus
  summary: string
  vertical: "Estate" | "Museum" | "Collection"
}

const primaryLiveModelSid = process.env.NEXT_PUBLIC_MATTERPORT_MODEL_SID ?? "oyaicKWaEQw"
const providerEnv = {
  kimi: Boolean(process.env.KIMI_API_KEY),
  minimax: Boolean(process.env.MINIMAX_API_KEY),
  openai: Boolean(process.env.OPENAI_API_KEY),
  qwen: Boolean(process.env.QWEN_API_KEY)
}

const projects: ProjectRecord[] = [
  {
    id: "estate-orchard",
    name: "Orchard Estate Review",
    status: "Active",
    summary:
      "Mehrgeschossiger Nachlass-Workflow fuer Behalten, Verkaufen, Spenden und Archivieren in klaren Review-Stufen.",
    vertical: "Estate",
    spaces: [
      {
        id: "orchard-main-house",
        matterportModelSid: primaryLiveModelSid,
        name: "Main House",
        projectId: "estate-orchard",
        projectName: "Orchard Estate Review",
        summary:
          "Grosser Wohnrundgang mit Moebeln, Archivmaterialien und dispositionsrelevanten Objekten ueber mehrere Raeumlichkeiten.",
        rooms: [
          {
            id: "living-room",
            name: "Living Room",
            objectIds: ["walnut-cabinet", "mantel-clock"],
            pendingReviewCount: 3,
            priorityBand: "High",
            recommendation: "Disposition bestaetigen und fuer wertige Objekte detailliertere Aufnahmen sichern.",
            summary: "Dichter Raum mit wahrscheinlich wertigen Moebeln und gemischten sentimentalen Objekten."
          },
          {
            id: "study",
            name: "Study",
            objectIds: ["atlas-desk", "archive-box"],
            pendingReviewCount: 1,
            priorityBand: "Medium",
            recommendation: "Papierbestaende vor jeder Aussonderung archivisch pruefen.",
            summary: "Papierlastiger Raum mit Unterlagen, Regalen und einem zentralen Schreibtischcluster."
          }
        ],
        objects: [
          {
            aiSummary:
              "Wahrscheinlich ein Aufbewahrungsschrank des fruehen 20. Jahrhunderts mit intakter Verbindungstechnik und gutem Wiederverkaufspotenzial nach Zustandspruefung.",
            disposition: "Sell",
            id: "walnut-cabinet",
            roomId: "living-room",
            roomName: "Living Room",
            status: "Needs Review",
            title: "Walnut Cabinet",
            type: "Furniture"
          },
          {
            aiSummary:
              "Die Kaminuhr wirkt dekorativ und moeglicherweise emotional bedeutsam; vor jeder Entscheidung wird ein Provenienzgespraech empfohlen.",
            disposition: "Keep",
            id: "mantel-clock",
            roomId: "living-room",
            roomName: "Living Room",
            status: "Reviewed",
            title: "Mantel Clock",
            type: "Decor"
          },
          {
            aiSummary:
              "Der grosse Schreibtisch mit Papieren und Schubladen deutet auf einen kombinierten Archiv- und Verwertungsprozess hin und verlangt eine zweigleisige Behandlung.",
            disposition: "Archive",
            id: "atlas-desk",
            roomId: "study",
            roomName: "Study",
            status: "Needs Review",
            title: "Atlas Desk",
            type: "Furniture"
          },
          {
            aiSummary:
              "Briefe und Dokumente in Boxen sollten im Archivstatus bleiben, bis Digitalisierung oder familiaere Sichtung abgeschlossen sind.",
            disposition: "Archive",
            id: "archive-box",
            roomId: "study",
            roomName: "Study",
            status: "Approved",
            title: "Archive Box",
            type: "Document Set"
          }
        ]
      }
    ]
  },
  {
    id: "museum-lantern",
    name: "Lantern House Digital Exhibition",
    status: "Pilot",
    summary:
      "Museumsartige Erzaehlung mit Fuehrungen, Sammlungsmetadaten und Objektkarten ueber einem digitalen Zwilling.",
    vertical: "Museum",
    spaces: [
      {
        id: "lantern-gallery",
        matterportModelSid: undefined,
        name: "North Gallery",
        projectId: "museum-lantern",
        projectName: "Lantern House Digital Exhibition",
        summary:
          "Kuratiertes Galerieumfeld fuer Story-Modus, Objektmetadaten und spaetere Deep-Zoom-Detailansichten.",
        rooms: [
          {
            id: "intro-hall",
            name: "Intro Hall",
            objectIds: ["brass-lantern", "visitor-map"],
            pendingReviewCount: 0,
            priorityBand: "Low",
            recommendation: "Nach finaler Pruefung der Beschriftung bereit fuer den oeffentlichen Story-Modus.",
            summary: "Einfuehrender Schwellenraum, der die gefuehrte Erzaehlung verankert."
          }
        ],
        objects: [
          {
            aiSummary:
              "Interpretatives Objekt mit starkem Erzaehlwert; ideal in Kombination mit hochaufgeloesten Bildkacheln und Konservierungsnotizen.",
            disposition: "Keep",
            id: "brass-lantern",
            roomId: "intro-hall",
            roomName: "Intro Hall",
            status: "Reviewed",
            title: "Brass Lantern",
            type: "Object"
          },
          {
            aiSummary:
              "Die Besucherkarte unterstuetzt die Orientierung und sollte aus dem rechten Kontextpanel verlinkt, nicht direkt in die Stage eingebettet werden.",
            disposition: "Keep",
            id: "visitor-map",
            roomId: "intro-hall",
            roomName: "Intro Hall",
            status: "Approved",
            title: "Visitor Map",
            type: "Interpretive Graphic"
          }
        ]
      }
    ]
  }
]

const providers: ProviderProfile[] = [
  {
    bestFor: ["tool orchestration", "multimodal coordination", "final user responses"],
    configured: providerEnv.openai,
    fallbackClass: "premium-generalist",
    id: "openai",
    label: "OpenAI GPT",
    specialty: "Stark in Reasoning und Workflow-Orchestrierung",
    status: providerEnv.openai ? "Active" : "Needs Review"
  },
  {
    bestFor: ["Self-Hosting-Strategie", "visuelle Analyse", "unternehmensweite Kostenkontrolle"],
    configured: providerEnv.qwen,
    fallbackClass: "vision-economy",
    id: "qwen",
    label: "Qwen",
    specialty: "Kostensensible multimodale Analyse",
    status: providerEnv.qwen ? "Active" : "Pilot"
  },
  {
    bestFor: ["lange Kontexte", "agentische Dokumentpruefung", "mehrstufige Narrativbildung"],
    configured: providerEnv.kimi,
    fallbackClass: "long-context",
    id: "kimi",
    label: "Kimi",
    specialty: "Langkontextuelle multimodale Analyse",
    status: providerEnv.kimi ? "Active" : "Pilot"
  },
  {
    bestFor: ["Sprache", "Video", "breite Modalitaetsabdeckung"],
    configured: providerEnv.minimax,
    fallbackClass: "media-extended",
    id: "minimax",
    label: "MiniMax",
    specialty: "Audio- und Medienerweiterung",
    status: providerEnv.minimax ? "Active" : "Needs Review"
  }
]

export function getProjects() {
  return projects
}

export function getProjectBySpaceId(spaceId: string) {
  return projects.find((project) => project.spaces.some((space) => space.id === spaceId))
}

export function getProviderProfiles() {
  return providers
}

export function getSpaceById(spaceId: string) {
  return projects.flatMap((project) => project.spaces).find((space) => space.id === spaceId)
}

export function getObjectById(spaceId: string, objectId: string) {
  return getSpaceById(spaceId)?.objects.find((objectRecord) => objectRecord.id === objectId)
}

export function getRoomById(spaceId: string, roomId: string) {
  return getSpaceById(spaceId)?.rooms.find((room) => room.id === roomId)
}
