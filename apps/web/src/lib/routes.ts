export const STAGE_MODES = ["explore", "work", "story", "review"] as const
export const immersiveModes = [...STAGE_MODES]

export type StageMode = (typeof STAGE_MODES)[number]

export function isStageMode(value: string): value is StageMode {
  return STAGE_MODES.includes(value as StageMode)
}

export function resolveImmersiveMode(value?: string): StageMode {
  if (value && isStageMode(value)) {
    return value
  }

  return "explore"
}

export function buildSpaceRoute(spaceId: string, mode: StageMode = "explore") {
  return `/spaces/${spaceId}/${mode}`
}

export function buildObjectRoute(spaceId: string, objectId: string) {
  return `/spaces/${spaceId}/objects/${objectId}`
}

export function buildRoomRoute(spaceId: string, roomId: string) {
  return `/spaces/${spaceId}/rooms/${roomId}`
}
