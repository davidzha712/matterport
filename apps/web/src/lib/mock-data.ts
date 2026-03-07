export type WorkflowStatus = "Active" | "Pilot" | "Needs Review"
export type ObjectStatus = "Reviewed" | "Needs Review" | "Approved"

export type ProviderProfile = {
  bestFor: string[]
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

const projects: ProjectRecord[] = [
  {
    id: "estate-orchard",
    name: "Orchard Estate Review",
    status: "Active",
    summary:
      "A multi-floor estate workflow focused on keep, sell, donate, and archive decisions across staged review queues.",
    vertical: "Estate",
    spaces: [
      {
        id: "orchard-main-house",
        matterportModelSid: undefined,
        name: "Main House",
        projectId: "estate-orchard",
        projectName: "Orchard Estate Review",
        summary:
          "Large residential walkthrough with furniture, archives, and object disposition decisions spread across eight rooms.",
        rooms: [
          {
            id: "living-room",
            name: "Living Room",
            objectIds: ["walnut-cabinet", "mantel-clock"],
            pendingReviewCount: 3,
            priorityBand: "High",
            recommendation: "Confirm disposition and capture higher-resolution details for valuables.",
            summary: "Dense room with likely high-value furniture and mixed sentimental keepsakes."
          },
          {
            id: "study",
            name: "Study",
            objectIds: ["atlas-desk", "archive-box"],
            pendingReviewCount: 1,
            priorityBand: "Medium",
            recommendation: "Review paper assets for archive handling before any disposal actions.",
            summary: "Paper-heavy room with records, shelving, and one major desk cluster."
          }
        ],
        objects: [
          {
            aiSummary:
              "Likely early 20th-century storage cabinet with intact joinery and strong resale potential after condition confirmation.",
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
              "Mantel clock appears decorative and possibly sentimental; provenance interview recommended before disposition.",
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
              "Large desk with papers and drawers suggests mixed archive and resale workflow, requiring dual-track handling.",
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
              "Boxed letters and documents should remain under archive status until digitization or family review is complete.",
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
      "A museum-style narrative experience with guided tours, collection metadata, and object story cards layered onto a digital twin.",
    vertical: "Museum",
    spaces: [
      {
        id: "lantern-gallery",
        matterportModelSid: undefined,
        name: "North Gallery",
        projectId: "museum-lantern",
        projectName: "Lantern House Digital Exhibition",
        summary:
          "Curated gallery space designed for story mode, object metadata, and deep-zoom detail viewing.",
        rooms: [
          {
            id: "intro-hall",
            name: "Intro Hall",
            objectIds: ["brass-lantern", "visitor-map"],
            pendingReviewCount: 0,
            priorityBand: "Low",
            recommendation: "Ready for public story mode after caption final review.",
            summary: "Introductory threshold space that anchors the guided narrative."
          }
        ],
        objects: [
          {
            aiSummary:
              "Interpretive object with strong narrative value; pair with high-resolution image tiles and conservation notes.",
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
              "Visitor map supports orientation and should be linked from the right-hand context panel, not embedded into the stage.",
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
    fallbackClass: "premium-generalist",
    id: "openai",
    label: "OpenAI GPT",
    specialty: "Strong reasoning and workflow orchestration",
    status: "Active"
  },
  {
    bestFor: ["self-hosting strategy", "vision-heavy parsing", "enterprise cost control"],
    fallbackClass: "vision-economy",
    id: "qwen",
    label: "Qwen",
    specialty: "Cost-sensitive multimodal parsing",
    status: "Pilot"
  },
  {
    bestFor: ["long context", "agentic document review", "multi-step narrative assembly"],
    fallbackClass: "long-context",
    id: "kimi",
    label: "Kimi",
    specialty: "Long-context multimodal analysis",
    status: "Pilot"
  },
  {
    bestFor: ["speech", "video", "broad modality coverage"],
    fallbackClass: "media-extended",
    id: "minimax",
    label: "MiniMax",
    specialty: "Audio and media extension layer",
    status: "Needs Review"
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

