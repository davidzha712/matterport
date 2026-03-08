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
  mode?: "estate" | "museum" | "inventory" | "story"
  name: string
  objects: ObjectRecord[]
  projectId: string
  projectName: string
  rooms: RoomRecord[]
  summary: string
  workflow?: {
    approvedCount: number
    pendingReviewCount: number
    reviewedCount: number
  }
}

export type ProjectRecord = {
  id: string
  name: string
  spaces: SpaceRecord[]
  status: WorkflowStatus
  summary: string
  vertical: "Estate" | "Museum" | "Collection"
}

export type ReviewQueueItem = {
  disposition: ObjectRecord["disposition"]
  objectId: string
  objectTitle: string
  priorityBand: RoomRecord["priorityBand"]
  projectId: string
  projectName: string
  roomId: string
  roomName: string
  spaceId: string
  spaceName: string
  status: ObjectStatus
}

export type SpatialAnnotation = {
  id: string
  label: string
  description: string
  position: { x: number; y: number; z: number }
  color?: string
  objectId?: string
  createdBy: "ai" | "manual"
  confidence?: number
}
