import type { StageMode } from "./routes"

type ToolbarFeatures = {
  viewModes: boolean
  tour: boolean
  screenshot: boolean
  measure: boolean
  aiDetect: boolean
}

type PanelVisibility = {
  leftPanel: boolean
  commandBar: boolean
  rightPanel: boolean
  objectWorkflowCard: boolean
  aiDetections: boolean
  workflowSidebar: boolean
}

export type AnnotationMode = "hidden" | "read-only" | "read-write"

export type IntroCardVariant = "full" | "compact" | "narrative" | "sell-focused"

type ImmersiveHints = {
  showVKey: boolean
  spaceKeyAction: string
}

type BottomChrome = {
  showStoryline: boolean
  storylineSize: "normal" | "large"
}

export type StageModeConfig = {
  toolbar: ToolbarFeatures
  panels: PanelVisibility
  annotations: AnnotationMode
  immersiveHints: ImmersiveHints
  introCardVariant: IntroCardVariant
  objectCardReadOnly: boolean
  showReviewCounts: boolean
  bottomChrome: BottomChrome
  accentClass: string
}

export const STAGE_MODE_CONFIGS: Record<StageMode, StageModeConfig> = {
  explore: {
    toolbar: { viewModes: true, tour: true, screenshot: true, measure: true, aiDetect: true },
    panels: {
      leftPanel: true,
      commandBar: true,
      rightPanel: true,
      objectWorkflowCard: false,
      aiDetections: true,
      workflowSidebar: false,
    },
    annotations: "read-write",
    immersiveHints: { showVKey: true, spaceKeyAction: "interact" },
    introCardVariant: "full",
    objectCardReadOnly: true,
    showReviewCounts: false,
    bottomChrome: { showStoryline: true, storylineSize: "normal" },
    accentClass: "mode--explore",
  },
  work: {
    toolbar: { viewModes: true, tour: true, screenshot: true, measure: true, aiDetect: true },
    panels: {
      leftPanel: true,
      commandBar: true,
      rightPanel: true,
      objectWorkflowCard: true,
      aiDetections: true,
      workflowSidebar: true,
    },
    annotations: "read-write",
    immersiveHints: { showVKey: true, spaceKeyAction: "interact" },
    introCardVariant: "compact",
    objectCardReadOnly: false,
    showReviewCounts: true,
    bottomChrome: { showStoryline: true, storylineSize: "normal" },
    accentClass: "mode--work",
  },
  story: {
    toolbar: { viewModes: true, tour: true, screenshot: true, measure: true, aiDetect: false },
    panels: {
      leftPanel: true,
      commandBar: false,
      rightPanel: true,
      objectWorkflowCard: true,
      aiDetections: false,
      workflowSidebar: false,
    },
    annotations: "read-only",
    immersiveHints: { showVKey: false, spaceKeyAction: "nextStop" },
    introCardVariant: "narrative",
    objectCardReadOnly: true,
    showReviewCounts: false,
    bottomChrome: { showStoryline: true, storylineSize: "large" },
    accentClass: "mode--story",
  },
  review: {
    toolbar: { viewModes: true, tour: true, screenshot: true, measure: true, aiDetect: false },
    panels: {
      leftPanel: true,
      commandBar: false,
      rightPanel: true,
      objectWorkflowCard: true,
      aiDetections: false,
      workflowSidebar: true,
    },
    annotations: "read-only",
    immersiveHints: { showVKey: false, spaceKeyAction: "review" },
    introCardVariant: "compact",
    objectCardReadOnly: false,
    showReviewCounts: true,
    bottomChrome: { showStoryline: true, storylineSize: "normal" },
    accentClass: "mode--review",
  },
  listing: {
    toolbar: { viewModes: true, tour: false, screenshot: true, measure: true, aiDetect: true },
    panels: {
      leftPanel: true,
      commandBar: true,
      rightPanel: true,
      objectWorkflowCard: true,
      aiDetections: true,
      workflowSidebar: false,
    },
    annotations: "read-only",
    immersiveHints: { showVKey: true, spaceKeyAction: "interact" },
    introCardVariant: "sell-focused",
    objectCardReadOnly: false,
    showReviewCounts: false,
    bottomChrome: { showStoryline: true, storylineSize: "normal" },
    accentClass: "mode--listing",
  },
}

export function getStageModeConfig(mode: StageMode): StageModeConfig {
  return STAGE_MODE_CONFIGS[mode]
}
