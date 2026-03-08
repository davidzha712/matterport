import type {
  ObjectRecord,
  ProjectRecord,
  ProviderProfile,
  ReviewQueueItem,
  RoomRecord,
  SpaceRecord,
  WorkflowStatus,
} from "@/lib/platform-types"

export type SanitySnapshot = {
  auditEvents?: Array<{
    afterDisposition?: ObjectRecord["disposition"]
    afterStatus?: ObjectRecord["status"]
    beforeDisposition?: ObjectRecord["disposition"]
    beforeStatus?: ObjectRecord["status"]
    eventId?: string
    eventTimestamp?: string
    note?: string | null
    objectId?: string
    objectRef?: string
    objectTitle?: string
    reviewer?: string
    roomId?: string
    roomRef?: string
    roomTitle?: string
    spaceId?: string
    spaceRef?: string
    spaceTitle?: string
  }>
  objects?: Array<{
    _id: string
    aiSummary?: string
    disposition?: ObjectRecord["disposition"]
    objectId?: string
    objectType?: string
    roomId?: string
    roomRef?: string
    roomTitle?: string
    spaceRef?: string
    status?: ObjectRecord["status"]
    title?: string
  }>
  projects?: Array<{
    _id: string
    projectId?: string
    slug?: string
    status?: WorkflowStatus
    summary?: string
    title?: string
    vertical?: string
  }>
  providerProfiles?: Array<{
    configured?: boolean
    fallbackClass?: string
    notes?: string
    preferredFor?: string[]
    providerId?: string
    specialty?: string
    status?: WorkflowStatus
    title?: string
  }>
  rooms?: Array<{
    _id: string
    priorityBand?: RoomRecord["priorityBand"]
    recommendation?: string
    roomId?: string
    spaceRef?: string
    summary?: string
    title?: string
  }>
  spaces?: Array<{
    _id: string
    matterportModelSid?: string
    mode?: SpaceRecord["mode"]
    projectId?: string
    projectRef?: string
    projectTitle?: string
    spaceId?: string
    summary?: string
    title?: string
  }>
}

type SnapshotIndex = {
  objectsBySpace: Map<string, ObjectRecord[]>
  projectMeta: Map<string, { id: string; name: string }>
  projects: ProjectRecord[]
  roomsBySpace: Map<string, RoomRecord[]>
}

function normalizeVertical(value?: string): ProjectRecord["vertical"] {
  if (value === "Estate" || value === "Museum" || value === "Collection") {
    return value
  }

  switch (value) {
    case "estate":
      return "Estate"
    case "museum":
      return "Museum"
    case "collection":
      return "Collection"
    default:
      return "Estate"
  }
}

function normalizeWorkflowStatus(value?: string): WorkflowStatus {
  if (value === "Active" || value === "Pilot" || value === "Needs Review") {
    return value
  }

  return "Pilot"
}

function buildIndexes(snapshot: SanitySnapshot): SnapshotIndex {
  const spaces = snapshot.spaces ?? []
  const rooms = snapshot.rooms ?? []
  const objects = snapshot.objects ?? []
  const projects = snapshot.projects ?? []

  const roomsBySpace = new Map<string, RoomRecord[]>()
  const objectsBySpace = new Map<string, ObjectRecord[]>()

  for (const space of spaces) {
    const publicSpaceId = space.spaceId ?? space._id
    const roomEntries = rooms
      .filter((room) => room.spaceRef === space._id)
      .map((room) => {
        const roomPublicId = room.roomId ?? room._id
        const roomObjects = objects.filter((objectRecord) => objectRecord.roomRef === room._id)

        return {
          id: roomPublicId,
          name: room.title ?? roomPublicId,
          objectIds: roomObjects.map((objectRecord) => objectRecord.objectId ?? objectRecord._id),
          pendingReviewCount: roomObjects.filter((objectRecord) => objectRecord.status === "Needs Review").length,
          priorityBand: room.priorityBand ?? "Medium",
          recommendation: room.recommendation ?? "",
          summary: room.summary ?? ""
        } satisfies RoomRecord
      })

    const objectEntries = objects
      .filter((objectRecord) => objectRecord.spaceRef === space._id)
      .map((objectRecord) => ({
        aiSummary: objectRecord.aiSummary ?? "",
        disposition: objectRecord.disposition ?? "Keep",
        id: objectRecord.objectId ?? objectRecord._id,
        roomId: objectRecord.roomId ?? objectRecord.roomRef ?? "",
        roomName: objectRecord.roomTitle ?? "",
        status: objectRecord.status ?? "Needs Review",
        title: objectRecord.title ?? objectRecord.objectId ?? objectRecord._id,
        type: objectRecord.objectType ?? "Object"
      }) satisfies ObjectRecord)

    roomsBySpace.set(publicSpaceId, roomEntries)
    objectsBySpace.set(publicSpaceId, objectEntries)
  }

  const projectMeta = new Map<string, { id: string; name: string }>()
  const projectEntries = projects.map((project) => {
    const publicProjectId = project.projectId ?? project.slug ?? project._id
    const projectSpaces = spaces
      .filter((space) => space.projectRef === project._id)
      .map((space) => {
        const publicSpaceId = space.spaceId ?? space._id
        const roomEntries = roomsBySpace.get(publicSpaceId) ?? []
        const objectEntries = objectsBySpace.get(publicSpaceId) ?? []
        const approvedCount = objectEntries.filter((item) => item.status === "Approved").length
        const pendingReviewCount = objectEntries.filter((item) => item.status === "Needs Review").length
        const reviewedCount = objectEntries.filter((item) => item.status === "Reviewed").length

        return {
          id: publicSpaceId,
          matterportModelSid: space.matterportModelSid,
          mode: space.mode ?? "estate",
          name: space.title ?? publicSpaceId,
          objects: objectEntries,
          projectId: publicProjectId,
          projectName: project.title ?? publicProjectId,
          rooms: roomEntries,
          summary: space.summary ?? "",
          workflow: {
            approvedCount,
            pendingReviewCount,
            reviewedCount
          }
        } satisfies SpaceRecord
      })

    projectMeta.set(publicProjectId, {
      id: publicProjectId,
      name: project.title ?? publicProjectId
    })

    return {
      id: publicProjectId,
      name: project.title ?? publicProjectId,
      spaces: projectSpaces,
      status: normalizeWorkflowStatus(project.status),
      summary: project.summary ?? "",
      vertical: normalizeVertical(project.vertical)
    } satisfies ProjectRecord
  })

  return {
    objectsBySpace,
    projectMeta,
    projects: projectEntries,
    roomsBySpace
  }
}

export function mapSnapshotToProjects(snapshot: SanitySnapshot): ProjectRecord[] {
  return buildIndexes(snapshot).projects
}

export function mapSnapshotToSpace(snapshot: SanitySnapshot, spaceId: string): SpaceRecord | undefined {
  return buildIndexes(snapshot).projects.flatMap((project) => project.spaces).find((space) => space.id === spaceId)
}

export function mapSnapshotToReviewQueue(snapshot: SanitySnapshot): ReviewQueueItem[] {
  const projects = buildIndexes(snapshot).projects

  return projects.flatMap((project) =>
    project.spaces.flatMap((space) =>
      space.objects
        .filter((objectRecord) => objectRecord.status === "Needs Review")
        .map((objectRecord) => {
          const room = space.rooms.find((candidate) => candidate.id === objectRecord.roomId)

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
            status: objectRecord.status
          } satisfies ReviewQueueItem
        })
    )
  )
}

export function mapSnapshotToProviders(snapshot: SanitySnapshot): ProviderProfile[] {
  return (snapshot.providerProfiles ?? []).map((provider) => ({
    bestFor: provider.preferredFor ?? [],
    configured: provider.configured ?? false,
    fallbackClass: provider.fallbackClass ?? "generalist",
    id: provider.providerId ?? provider.title ?? "provider",
    label: provider.title ?? provider.providerId ?? "Provider",
    specialty: provider.specialty ?? provider.notes ?? "",
    status: normalizeWorkflowStatus(provider.status)
  }))
}
