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

export type TopbarVariant = "full" | "minimal" | "hidden"

export type IntroCardVariant = "full" | "compact" | "narrative" | "sell-focused"

type ImmersiveHints = {
  showVKey: boolean
  spaceKeyAction: string
}

type BottomChrome = {
  showStoryline: boolean
  storylineSize: "normal" | "large"
  variant: "full" | "minimal" | "gallery"
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
  topbarVariant: TopbarVariant
  showGlobalNav: boolean
  showBreadcrumbs: boolean
  letterboxing: boolean
  showApprovalProgress: boolean
  showShareButton: boolean
  showFilmstrip: boolean
}

export const STAGE_MODE_CONFIGS: Record<StageMode, StageModeConfig> = {
  explore: {
    toolbar: { viewModes: true, tour: true, screenshot: true, measure: false, aiDetect: true },
    panels: {
      leftPanel: true,
      commandBar: true,
      rightPanel: true,
      objectWorkflowCard: false,
      aiDetections: true,
      workflowSidebar: false,
    },
    annotations: "read-only",
    immersiveHints: { showVKey: true, spaceKeyAction: "interact" },
    introCardVariant: "full",
    objectCardReadOnly: true,
    showReviewCounts: false,
    bottomChrome: { showStoryline: true, storylineSize: "normal", variant: "full" },
    accentClass: "mode--explore",
    topbarVariant: "minimal",
    showGlobalNav: false,
    showBreadcrumbs: true,
    letterboxing: false,
    showApprovalProgress: false,
    showShareButton: false,
    showFilmstrip: false,
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
    bottomChrome: { showStoryline: true, storylineSize: "normal", variant: "full" },
    accentClass: "mode--work",
    topbarVariant: "full",
    showGlobalNav: true,
    showBreadcrumbs: true,
    letterboxing: false,
    showApprovalProgress: false,
    showShareButton: false,
    showFilmstrip: false,
  },
  story: {
    toolbar: { viewModes: true, tour: true, screenshot: true, measure: true, aiDetect: false },
    panels: {
      leftPanel: true,
      commandBar: false,
      rightPanel: false,
      objectWorkflowCard: false,
      aiDetections: false,
      workflowSidebar: false,
    },
    annotations: "read-only",
    immersiveHints: { showVKey: false, spaceKeyAction: "nextStop" },
    introCardVariant: "narrative",
    objectCardReadOnly: true,
    showReviewCounts: false,
    bottomChrome: { showStoryline: true, storylineSize: "large", variant: "minimal" },
    accentClass: "mode--story",
    topbarVariant: "hidden",
    showGlobalNav: false,
    showBreadcrumbs: false,
    letterboxing: true,
    showApprovalProgress: false,
    showShareButton: false,
    showFilmstrip: false,
  },
  review: {
    toolbar: { viewModes: true, tour: true, screenshot: true, measure: true, aiDetect: false },
    panels: {
      leftPanel: false,
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
    bottomChrome: { showStoryline: true, storylineSize: "normal", variant: "minimal" },
    accentClass: "mode--review",
    topbarVariant: "full",
    showGlobalNav: true,
    showBreadcrumbs: true,
    letterboxing: false,
    showApprovalProgress: true,
    showShareButton: false,
    showFilmstrip: false,
  },
  listing: {
    toolbar: { viewModes: true, tour: false, screenshot: true, measure: true, aiDetect: true },
    panels: {
      leftPanel: true,
      commandBar: true,
      rightPanel: false,
      objectWorkflowCard: true,
      aiDetections: true,
      workflowSidebar: false,
    },
    annotations: "read-only",
    immersiveHints: { showVKey: true, spaceKeyAction: "interact" },
    introCardVariant: "sell-focused",
    objectCardReadOnly: false,
    showReviewCounts: false,
    bottomChrome: { showStoryline: true, storylineSize: "normal", variant: "gallery" },
    accentClass: "mode--listing",
    topbarVariant: "minimal",
    showGlobalNav: false,
    showBreadcrumbs: true,
    letterboxing: false,
    showApprovalProgress: false,
    showShareButton: true,
    showFilmstrip: true,
  },
}

export function getStageModeConfig(mode: StageMode): StageModeConfig {
  return STAGE_MODE_CONFIGS[mode]
}
