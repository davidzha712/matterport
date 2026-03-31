import type {
  ProjectRecord,
  ProviderProfile,
  ReviewQueueItem,
} from "@/lib/platform-types";

export type {
  ObjectRecord,
  ObjectStatus,
  ProjectRecord,
  ProviderProfile,
  ReviewQueueItem,
  RoomRecord,
  SpaceRecord,
  WorkflowStatus,
} from "@/lib/platform-types";

const primaryLiveModelSid =
  process.env.NEXT_PUBLIC_MATTERPORT_MODEL_SID ?? "oyaicKWaEQw";
const providerEnv = {
  kimi: Boolean(process.env.KIMI_API_KEY),
  minimax: Boolean(process.env.MINIMAX_API_KEY),
  openai: Boolean(process.env.OPENAI_API_KEY),
  qwen: Boolean(process.env.QWEN_API_KEY),
};

const projectName = process.env.NEXT_PUBLIC_PROJECT_NAME ?? "Matterport Inventory";

const projects: ProjectRecord[] = [
  {
    id: "default-project",
    name: projectName,
    status: "Active",
    summary:
      "Objekterfassung und Dispositions-Workflow im digitalen Zwilling.",
    vertical: "Estate",
    spaces: [
      {
        id: "main-space",
        matterportModelSid: primaryLiveModelSid,
        name: process.env.NEXT_PUBLIC_SPACE_NAME ?? "Hauptraum",
        projectId: "default-project",
        projectName,
        summary:
          "Matterport-Scan mit KI-gestuetzter Objekterkennung und Review-Workflow.",
        rooms: [],
        objects: [],
      },
    ],
  },
];

const providers: ProviderProfile[] = [
  {
    bestFor: [
      "tool orchestration",
      "multimodal coordination",
      "final user responses",
    ],
    configured: providerEnv.openai,
    fallbackClass: "premium-generalist",
    id: "openai",
    label: "OpenAI GPT",
    specialty: "Stark in Reasoning und Workflow-Orchestrierung",
    status: providerEnv.openai ? "Active" : "Needs Review",
  },
  {
    bestFor: [
      "Self-Hosting-Strategie",
      "visuelle Analyse",
      "unternehmensweite Kostenkontrolle",
    ],
    configured: providerEnv.qwen,
    fallbackClass: "vision-economy",
    id: "qwen",
    label: "Qwen",
    specialty: "Kostensensible multimodale Analyse",
    status: providerEnv.qwen ? "Active" : "Pilot",
  },
  {
    bestFor: [
      "lange Kontexte",
      "agentische Dokumentpruefung",
      "mehrstufige Narrativbildung",
    ],
    configured: providerEnv.kimi,
    fallbackClass: "long-context",
    id: "kimi",
    label: "Kimi",
    specialty: "Langkontextuelle multimodale Analyse",
    status: providerEnv.kimi ? "Active" : "Pilot",
  },
  {
    bestFor: ["Sprache", "Video", "breite Modalitaetsabdeckung"],
    configured: providerEnv.minimax,
    fallbackClass: "media-extended",
    id: "minimax",
    label: "MiniMax",
    specialty: "Audio- und Medienerweiterung",
    status: providerEnv.minimax ? "Active" : "Needs Review",
  },
];

export function getProjects() {
  return projects;
}

export function getProjectBySpaceId(spaceId: string) {
  return projects.find((project) =>
    project.spaces.some((space) => space.id === spaceId),
  );
}

export function getProviderProfiles() {
  return providers;
}

export function getReviewQueue(): ReviewQueueItem[] {
  return projects.flatMap((project) =>
    project.spaces.flatMap((space) =>
      space.objects
        .filter((objectRecord) => objectRecord.status === "Needs Review")
        .map((objectRecord) => {
          const room = space.rooms.find(
            (candidate) => candidate.id === objectRecord.roomId,
          );

          return {
            disposition: objectRecord.disposition,
            objectId: objectRecord.id,
            objectTitle: objectRecord.title,
            priorityBand: room?.priorityBand ?? "Medium",
            projectId: project.id,
            projectName: project.name,
            roomId: objectRecord.roomId,
            roomName: objectRecord.roomName,
            spaceId: space.id,
            spaceName: space.name,
            status: objectRecord.status,
          };
        }),
    ),
  );
}

export function getSpaceById(spaceId: string) {
  return projects
    .flatMap((project) => project.spaces)
    .find((space) => space.id === spaceId);
}

export function getObjectById(spaceId: string, objectId: string) {
  return getSpaceById(spaceId)?.objects.find(
    (objectRecord) => objectRecord.id === objectId,
  );
}

export function getRoomById(spaceId: string, roomId: string) {
  return getSpaceById(spaceId)?.rooms.find((room) => room.id === roomId);
}
