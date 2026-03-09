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

export type ObjectCondition = "Excellent" | "Good" | "Fair" | "Poor" | "Unknown"

export type ObjectRecord = {
  aiSummary: string
  category?: string
  condition?: ObjectCondition
  confidence?: number
  createdAt?: string
  createdBy?: "ai" | "manual"
  description?: string
  dimensions?: { width?: number; height?: number; depth?: number; unit?: string }
  disposition: "Keep" | "Sell" | "Donate" | "Archive"
  era?: string
  estimatedValue?: { min?: number; max?: number; currency?: string }
  id: string
  insuranceNotes?: string
  material?: string
  notes?: string
  position?: { x: number; y: number; z: number }
  provenance?: string
  roomId: string
  roomName: string
  spaceId?: string
  status: ObjectStatus
  tagId?: string
  title: string
  type: string
  updatedAt?: string
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
  category?: string
  material?: string
  condition?: ObjectCondition
  estimatedValue?: { min?: number; max?: number; currency?: string }
  roomId?: string
  roomName?: string
  spaceId?: string
  tagId?: string
  savedToApi?: boolean
}
