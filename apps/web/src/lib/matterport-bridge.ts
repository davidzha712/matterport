import type { SpatialAnnotation } from "./platform-types"

// ---------------------------------------------------------------------------
// Minimal SDK type declarations (subset of @matterport/sdk)
// ---------------------------------------------------------------------------

interface Vector3 {
  x: number
  y: number
  z: number
}

interface Rotation {
  x: number
  y: number
}

interface CameraPose {
  position: Vector3
  rotation: Rotation
  mode: string
  sweep: string
}

/** A depth sample captured at screenshot time for 2D→3D projection. */
interface DepthSample {
  /** Normalised screen coordinate 0..1 */
  nx: number
  /** Normalised screen coordinate 0..1 */
  ny: number
  /** World position of the surface at this screen point */
  worldPos: Vector3
  /** Distance from camera to this surface point (metres) */
  depth: number
}

interface SweepData {
  sid: string
  position: Vector3
  floorInfo: { id: string; sequence: number } | undefined
  neighbors: string[]
  enabled: boolean
}

interface FloorData {
  id: string
  name: string
  sequence: number
}

/** Our internal room type (uses `name`). */
interface RoomData {
  id: string
  name: string
  bounds: { min: Vector3; max: Vector3 }
}

/** SDK room type (uses `label`, has extra fields). */
interface SdkRoomData {
  id: string
  label: string
  bounds: { min: Vector3; max: Vector3 }
  center?: Vector3
  size?: Vector3
  floorInfo?: { id: string; sequence: number }
}

/** SDK Room.current returns an array of rooms the camera is in. */
interface CurrentRooms {
  rooms: SdkRoomData[]
}

interface TourSnapshot {
  sid: string
  name: string
  imageUrl: string
}

interface TagData {
  id: string
  label: string
  description: string
  anchorPosition: Vector3
  stemVector: Vector3
  color: { r: number; g: number; b: number }
}

interface Observable<T> {
  subscribe(callback: (data: T) => void): { cancel: () => void }
}

interface CollectionObservable<T> {
  subscribe(handlers: {
    onCollectionUpdated: (collection: Map<string, T> | Array<T>) => void
  }): { cancel: () => void }
}

interface SweepMoveOptions {
  rotation?: Rotation
  transition?: number
  transitionTime?: number
}

interface ModeTransitionOptions {
  transition?: number
  position?: Vector3
  rotation?: Rotation
}

interface ScreenshotResolution {
  width: number
  height: number
}

interface ScreenshotVisibility {
  measurements?: boolean
  mattertags?: boolean
  sweeps?: boolean
  views?: boolean
}

interface PointerIntersection {
  position: Vector3
  normal: Vector3
  floorIndex: number | undefined
  object: string
}

interface ModelDetails {
  sid: string
  name?: string
  description?: string
  summary?: string
  address?: string
  presentedBy?: string
  shareUrl?: string
}

interface ModelData {
  sid: string
  modelSupportsVr: boolean
}

/** Subset of the Matterport mpSdk object we use. */
interface MpSdk {
  Sweep: {
    moveTo: (sweepId: string, options?: SweepMoveOptions) => Promise<void>
    current: Observable<SweepData>
    data: CollectionObservable<SweepData>
    Event: { ENTER: string; EXIT: string }
    Transition: { INSTANT: number; FLY: number; FADEOUT: number }
  }
  Camera: {
    rotate: (horizontal: number, vertical: number) => Promise<void>
    setRotation: (rotation: Rotation) => Promise<void>
    lookAt: (position: Vector3, options?: {
      mode?: string
      transition?: string
      offset?: Vector3
    }) => Promise<void>
    zoomTo: (level: number) => Promise<number>
    zoomBy: (delta: number) => Promise<number>
    zoomReset: () => Promise<void>
    pose: Observable<CameraPose>
  }
  Mode: {
    moveTo: (mode: string, options?: ModeTransitionOptions) => Promise<void>
    current: Observable<{ mode: string }>
    Mode: { INSIDE: string; DOLLHOUSE: string; FLOORPLAN: string }
    TransitionType: { FLY: number; INSTANT: number }
    Event: { CHANGE_END: string }
  }
  Tag: {
    add: (data: {
      label: string
      description: string
      anchorPosition: Vector3
      stemVector: Vector3
      color?: { r: number; g: number; b: number }
    }) => Promise<string[]>
    remove: (...ids: string[]) => Promise<void>
    editBillboard: (id: string, properties: Partial<{
      label: string
      description: string
    }>) => Promise<void>
    editColor: (id: string, color: { r: number; g: number; b: number }) => Promise<void>
    editPosition: (id: string, options: Partial<{
      anchorPosition: Vector3
      stemVector: Vector3
    }>) => Promise<void>
    editOpacity: (id: string, opacity: number) => Promise<void>
    open: (id: string) => Promise<void>
    close: (id: string) => Promise<void>
    toggleNavControls?: (enabled: boolean) => Promise<void>
    data: CollectionObservable<TagData>
    Event: { CLICK: string; HOVER: string }
  }
  Mattertag: {
    navigateToTag: (tagSid: string) => Promise<void>
  }
  Tour: {
    start: (index?: number) => Promise<void>
    stop: () => Promise<void>
    next: () => Promise<void>
    prev: () => Promise<void>
    step: (index: number) => Promise<void>
    getData: () => Promise<TourSnapshot[]>
    Event: { STARTED: string; STOPPED: string; STEPPED: string }
  }
  Renderer: {
    takeScreenShot: (
      resolution?: ScreenshotResolution,
      visibility?: ScreenshotVisibility
    ) => Promise<string>
    getWorldPositionData: (
      screenPosition: { x: number; y: number }
    ) => Promise<{ position: Vector3 | null; floor: number; floorInfo: { id: string; sequence: number } }>
  }
  Floor: {
    moveTo: (floor: number) => Promise<void>
    showAll: () => Promise<void>
    getData: () => Promise<FloorData[]>
    current: Observable<{ id: string; sequence: number } | undefined>
  }
  Room: {
    current: Observable<CurrentRooms>
    data: CollectionObservable<SdkRoomData>
  }
  Pointer: {
    intersection: Observable<PointerIntersection>
  }
  Model: {
    Event: { MODEL_LOADED: string }
    getData: () => Promise<ModelData>
    getDetails: () => Promise<ModelDetails>
  }
  on: (event: string, callback: (...args: unknown[]) => void) => void
  off: (event: string, callback: (...args: unknown[]) => void) => void
}

/** Window augmentation for SDK embed. */
interface ShowcaseEmbedWindow extends Window {
  MP_SDK: {
    connect: (
      iframe: HTMLIFrameElement,
      applicationKey: string,
      sdkVersion?: string
    ) => Promise<MpSdk>
  }
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type BridgeStatus = "disconnected" | "iframe-only" | "sdk-connected"
export type ViewMode = "inside" | "dollhouse" | "floorplan"
export type { CameraPose, PointerIntersection, ModelDetails, RoomData, SweepData, FloorData, TagData, TourSnapshot }

type AnnotationListener = (annotations: SpatialAnnotation[]) => void
type SweepChangeCallback = (sweep: SweepData) => void
type RoomChangeCallback = (room: RoomData | undefined) => void
type ModeChangeCallback = (mode: ViewMode) => void
type TourStepCallback = (stepIndex: number) => void
type TourStateChangeCallback = (active: boolean) => void
type FloorChangeCallback = (floor: { id: string; sequence: number } | undefined) => void
type PointerCallback = (intersection: PointerIntersection) => void

interface Subscription {
  cancel: () => void
}

interface NavigateToSweepOptions {
  rotation?: Rotation
  transition?: "fly" | "instant" | "fadeout"
  transitionTime?: number
}

// ---------------------------------------------------------------------------
// MatterportBridge
// ---------------------------------------------------------------------------

export class MatterportBridge {
  private iframe: HTMLIFrameElement | null = null
  private sdk: MpSdk | null = null
  private annotations: Map<string, SpatialAnnotation> = new Map()
  private annotationToTagId: Map<string, string> = new Map()
  private annotationListeners: Set<AnnotationListener> = new Set()

  private sweepChangeCallbacks: Set<SweepChangeCallback> = new Set()
  private roomChangeCallbacks: Set<RoomChangeCallback> = new Set()
  private modeChangeCallbacks: Set<ModeChangeCallback> = new Set()
  private tourStepCallbacks: Set<TourStepCallback> = new Set()
  private tourStateChangeCallbacks: Set<TourStateChangeCallback> = new Set()
  private floorChangeCallbacks: Set<FloorChangeCallback> = new Set()
  private pointerCallbacks: Set<PointerCallback> = new Set()

  private subscriptions: Subscription[] = []

  private _status: BridgeStatus = "disconnected"
  private _isTourActive = false
  private _currentSweep: SweepData | null = null
  private _currentRoom: RoomData | undefined = undefined
  private _currentMode: string = ""
  private _currentFloor: { id: string; sequence: number } | undefined = undefined
  private _lastPose: CameraPose | null = null
  private _screenshotPose: CameraPose | null = null
  private _screenshotDepthGrid: DepthSample[] = []

  private _sweeps: SweepData[] = []
  private _rooms: RoomData[] = []
  private _floors: FloorData[] = []
  private _tags: TagData[] = []
  private _tourSnapshots: TourSnapshot[] = []
  private _sdkTourStarted = false
  private _modelDetails: ModelDetails | null = null

  // -----------------------------------------------------------------------
  // Getters
  // -----------------------------------------------------------------------

  get status(): BridgeStatus {
    return this._status
  }

  get isTourActive(): boolean {
    return this._isTourActive
  }

  get sweeps(): ReadonlyArray<SweepData> {
    return this._sweeps
  }

  get rooms(): ReadonlyArray<RoomData> {
    return this._rooms
  }

  get floors(): ReadonlyArray<FloorData> {
    return this._floors
  }

  get currentSweep(): SweepData | null {
    return this._currentSweep
  }

  get currentRoom(): RoomData | undefined {
    return this._currentRoom
  }

  get currentMode(): string {
    return this._currentMode
  }

  get currentFloor(): { id: string; sequence: number } | undefined {
    return this._currentFloor
  }

  get tags(): ReadonlyArray<TagData> {
    return this._tags
  }

  get tourSnapshots(): ReadonlyArray<TourSnapshot> {
    return this._tourSnapshots
  }

  get modelDetails(): ModelDetails | null {
    return this._modelDetails
  }

  /** Camera pose captured at the moment of the last screenshot. */
  get screenshotPose(): CameraPose | null {
    return this._screenshotPose
      ? {
          ...this._screenshotPose,
          position: { ...this._screenshotPose.position },
          rotation: { ...this._screenshotPose.rotation },
        }
      : null
  }

  // -----------------------------------------------------------------------
  // Connection lifecycle
  // -----------------------------------------------------------------------

  async attachIframe(iframe: HTMLIFrameElement): Promise<void> {
    this.iframe = iframe
    this._status = "iframe-only"

    // SDK connection runs in background — never blocks the iframe from loading
    const sdkKey = process.env.NEXT_PUBLIC_MATTERPORT_SDK_KEY
    if (sdkKey) {
      void this.connectSdk(iframe, sdkKey)
    }
  }

  private async connectSdk(iframe: HTMLIFrameElement, sdkKey: string): Promise<void> {
    try {
      await this.ensureSdkBundle()

      const embeddingWindow = window as unknown as ShowcaseEmbedWindow
      if (!embeddingWindow.MP_SDK) {
        console.warn("Matterport MP_SDK not available after loading bundle")
        return
      }

      // Race SDK connect against a timeout so it never hangs forever
      const SDK_TIMEOUT = 60_000
      const mpSdk = await Promise.race([
        embeddingWindow.MP_SDK.connect(iframe, sdkKey, ""),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("SDK connect timeout")), SDK_TIMEOUT)
        ),
      ])

      this.sdk = mpSdk

      this.initSubscriptions()

      // Wait for model to be fully loaded and SDK internals to initialize
      await new Promise<void>((resolve) => {
        let resolved = false
        const done = () => { if (!resolved) { resolved = true; resolve() } }
        mpSdk.on(mpSdk.Model.Event.MODEL_LOADED, done)
        void mpSdk.Model.getData().then(done).catch(() => {})
        // Safety fallback
        setTimeout(done, 5000)
      })
      // Additional settle time for SDK internal APIs (Floor, Renderer, etc.)
      await new Promise((r) => setTimeout(r, 2000))

      await this.loadModelData()

      // Hide Matterport's built-in navigation overlay controls
      try {
        await this.sdk.Tag.toggleNavControls?.(false)
      } catch {
        // toggleNavControls not available in this SDK version
      }

      // Mark as fully connected AFTER model data is loaded — ensures that
      // components (loadFromApi, auto-tour) only run when sweeps/rooms are ready
      this._status = "sdk-connected"
    } catch (error) {
      console.error("Matterport SDK connection failed:", error)
    }
  }

  private async ensureSdkBundle(): Promise<void> {
    const w = window as unknown as ShowcaseEmbedWindow
    if (w.MP_SDK) return

    return new Promise<void>((resolve, reject) => {
      const script = document.createElement("script")
      script.src = "https://static.matterport.com/showcase-sdk/latest.js"
      script.onload = () => resolve()
      script.onerror = () => reject(new Error("Failed to load Matterport SDK bundle"))
      document.head.appendChild(script)
    })
  }

  detach(): void {
    this.teardownSubscriptions()
    this.sdk = null
    this.iframe = null
    this._status = "disconnected"
    this._isTourActive = false
    this._sdkTourStarted = false
    this._currentSweep = null
    this._currentRoom = undefined
    this._currentMode = ""
    this._currentFloor = undefined
    this._lastPose = null
    this._screenshotPose = null
    this._sweeps = []
    this._rooms = []
    this._floors = []
    this.annotationToTagId = new Map()
  }

  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------

  async navigateToSweep(
    sweepId: string,
    options?: NavigateToSweepOptions
  ): Promise<boolean> {
    if (!this.sdk) {
      return false
    }

    try {
      const transitionMap: Record<string, number> = {
        fly: this.sdk.Sweep.Transition.FLY,
        instant: this.sdk.Sweep.Transition.INSTANT,
        fadeout: this.sdk.Sweep.Transition.FADEOUT,
      }

      const sdkOptions: SweepMoveOptions = {}
      if (options?.rotation) {
        sdkOptions.rotation = { ...options.rotation }
      }
      if (options?.transition) {
        sdkOptions.transition = transitionMap[options.transition]
      }
      if (options?.transitionTime !== undefined) {
        sdkOptions.transitionTime = options.transitionTime
      }

      await this.sdk.Sweep.moveTo(sweepId, sdkOptions)
      return true
    } catch (error) {
      console.error("navigateToSweep failed:", error)
      return false
    }
  }

  async navigateToRoom(roomId: string): Promise<boolean> {
    if (!this.sdk) {
      return false
    }

    const room = this._rooms.find((r) => r.id === roomId)
    if (!room?.bounds) {
      return false
    }

    // Find enabled sweeps whose position falls within this room's bounds
    const b = room.bounds
    const roomSweeps = this._sweeps.filter(
      (sweep) =>
        sweep.enabled &&
        sweep.position.x >= b.min.x && sweep.position.x <= b.max.x &&
        sweep.position.y >= b.min.y && sweep.position.y <= b.max.y &&
        sweep.position.z >= b.min.z && sweep.position.z <= b.max.z
    )
    if (roomSweeps.length === 0) {
      return false
    }

    // Pick the sweep closest to the room center
    const cx = (b.min.x + b.max.x) / 2
    const cy = (b.min.y + b.max.y) / 2
    const cz = (b.min.z + b.max.z) / 2
    let best = roomSweeps[0]
    let bestDist = Infinity
    for (const s of roomSweeps) {
      const d = (s.position.x - cx) ** 2 + (s.position.y - cy) ** 2 + (s.position.z - cz) ** 2
      if (d < bestDist) {
        bestDist = d
        best = s
      }
    }

    return this.navigateToSweep(best.sid, { transition: "fly" })
  }

  async setViewMode(mode: ViewMode): Promise<boolean> {
    if (!this.sdk) {
      return false
    }

    const modeMap: Record<ViewMode, string> = {
      inside: this.sdk.Mode.Mode.INSIDE,
      dollhouse: this.sdk.Mode.Mode.DOLLHOUSE,
      floorplan: this.sdk.Mode.Mode.FLOORPLAN,
    }

    // Try with FLY transition, retry with INSTANT if that fails
    for (const transition of [this.sdk.Mode.TransitionType.FLY, this.sdk.Mode.TransitionType.INSTANT]) {
      try {
        await this.sdk.Mode.moveTo(modeMap[mode], { transition })
        return true
      } catch {
        // retry with next transition type
      }
    }

    // Final attempt without options
    try {
      await this.sdk.Mode.moveTo(modeMap[mode])
      return true
    } catch (error) {
      console.error("setViewMode failed:", error)
      return false
    }
  }

  async moveToFloor(floorIndex: number): Promise<boolean> {
    if (!this.sdk) {
      return false
    }

    try {
      await this.sdk.Floor.moveTo(floorIndex)
      return true
    } catch (error) {
      console.error("moveToFloor failed:", error)
      return false
    }
  }

  // -----------------------------------------------------------------------
  // Tour
  // -----------------------------------------------------------------------

  async startTour(startIndex?: number): Promise<boolean> {
    if (!this.sdk) {
      return false
    }

    try {
      await this.sdk.Tour.start(startIndex)
      return true
    } catch {
      // Expected SDK behavior — another transition is active, silently return false
      return false
    }
  }

  async stopTour(): Promise<boolean> {
    if (!this.sdk) {
      return false
    }

    this._sdkTourStarted = false

    try {
      await this.sdk.Tour.stop()
      return true
    } catch (error) {
      console.error("stopTour failed:", error)
      return false
    }
  }

  async nextTourStep(): Promise<boolean> {
    if (!this.sdk) {
      return false
    }

    try {
      await this.sdk.Tour.next()
      return true
    } catch {
      // Expected when another transition is active — silently ignore
      return false
    }
  }

  async prevTourStep(): Promise<boolean> {
    if (!this.sdk) {
      return false
    }

    try {
      await this.sdk.Tour.prev()
      return true
    } catch {
      // Expected when another transition is active — silently ignore
      return false
    }
  }

  async getTourSnapshots(): Promise<TourSnapshot[]> {
    if (!this.sdk) {
      return []
    }

    try {
      return await this.sdk.Tour.getData()
    } catch (error) {
      console.error("getTourSnapshots failed:", error)
      return []
    }
  }

  // -----------------------------------------------------------------------
  // Tags (SDK 3D spatial tags)
  // -----------------------------------------------------------------------

  async addTag(data: {
    label: string
    description: string
    anchorPosition: Vector3
    stemVector?: Vector3
    color?: { r: number; g: number; b: number }
  }, annotationId?: string): Promise<string | null> {
    if (!this.sdk) {
      return null
    }

    try {
      const ids = await this.sdk.Tag.add({
        label: data.label,
        description: data.description,
        anchorPosition: { ...data.anchorPosition },
        stemVector: data.stemVector
          ? { ...data.stemVector }
          : { x: 0, y: 0.15, z: 0 },
        color: data.color,
      })
      const tagId = ids[0] ?? null
      if (tagId && annotationId) {
        this.annotationToTagId.set(annotationId, tagId)
      }
      return tagId
    } catch (error) {
      console.error("addTag failed:", error)
      return null
    }
  }

  async removeTag(id: string): Promise<boolean> {
    if (!this.sdk) {
      return false
    }

    try {
      await this.sdk.Tag.remove(id)
      // Clean up mapping
      for (const [annId, tId] of this.annotationToTagId.entries()) {
        if (tId === id) {
          this.annotationToTagId.delete(annId)
          break
        }
      }
      return true
    } catch (error) {
      console.error("removeTag failed:", error)
      return false
    }
  }

  // -----------------------------------------------------------------------
  // Annotations (local state + optional SDK tag sync)
  // -----------------------------------------------------------------------

  addAnnotation(
    data: Omit<SpatialAnnotation, "id">,
    options?: { skipTagSync?: boolean; existingTagId?: string }
  ): SpatialAnnotation {
    const annotation: SpatialAnnotation = {
      ...data,
      id: `ann_${crypto.randomUUID().slice(0, 8)}`,
    }
    this.annotations = new Map(this.annotations).set(annotation.id, annotation)
    this.notifyAnnotationListeners()

    // Track existing tag ID if provided (avoids creating a duplicate)
    if (options?.existingTagId) {
      this.annotationToTagId = new Map(this.annotationToTagId).set(
        annotation.id,
        options.existingTagId
      )
    } else if (!options?.skipTagSync && this.sdk) {
      // Sync to SDK tag if connected
      const hexColor = annotation.color ?? "#ff3333"
      const rgb = hexToRgb(hexColor)

      void this.addTag({
        label: annotation.label,
        description: annotation.description,
        anchorPosition: { ...annotation.position },
        color: rgb,
      }, annotation.id)
    }

    return annotation
  }

  updateAnnotation(
    id: string,
    updates: Partial<Omit<SpatialAnnotation, "id">>
  ): SpatialAnnotation | null {
    const existing = this.annotations.get(id)
    if (!existing) {
      return null
    }

    const updated: SpatialAnnotation = { ...existing, ...updates }
    this.annotations = new Map(this.annotations).set(id, updated)
    this.notifyAnnotationListeners()

    // Re-sync to SDK: remove old tag and create new one
    if (this.sdk) {
      const oldTagId = this.annotationToTagId.get(id)
      if (oldTagId) {
        this.removeTag(oldTagId).then(() => {
          const hexColor = updated.color ?? "#ff3333"
          const rgb = hexToRgb(hexColor)

          void this.addTag({
            label: updated.label,
            description: updated.description,
            anchorPosition: { ...updated.position },
            color: rgb,
          }, id)
        })
      }
    }

    return updated
  }

  removeAnnotation(id: string): boolean {
    const next = new Map(this.annotations)
    const removed = next.delete(id)
    if (removed) {
      this.annotations = next
      this.notifyAnnotationListeners()

      // Remove SDK tag if present
      const tagId = this.annotationToTagId.get(id)
      if (tagId && this.sdk) {
        this.removeTag(tagId)
        const nextTagMap = new Map(this.annotationToTagId)
        nextTagMap.delete(id)
        this.annotationToTagId = nextTagMap
      }
    }
    return removed
  }

  getAnnotations(): SpatialAnnotation[] {
    return Array.from(this.annotations.values())
  }

  // -----------------------------------------------------------------------
  // Screenshot
  // -----------------------------------------------------------------------

  async captureScreenshot(
    resolution?: ScreenshotResolution
  ): Promise<string | null> {
    if (!this.sdk) {
      return null
    }

    // Save camera pose atomically with screenshot — used later for 2D→3D projection.
    // Deep-copy nested objects so later pose updates don't corrupt the saved snapshot.
    this._screenshotPose = this._lastPose
      ? {
          ...this._lastPose,
          position: { ...this._lastPose.position },
          rotation: { ...this._lastPose.rotation },
        }
      : null

    // Take the screenshot FIRST so the image matches the saved pose as closely
    // as possible, then sample the depth grid while the caller processes the image.
    const resolutions: Array<ScreenshotResolution | undefined> = [
      resolution ?? { width: 1920, height: 1080 },
      { width: 1280, height: 720 },
      undefined,
    ]

    let result: string | null = null
    for (const res of resolutions) {
      try {
        const base64 = res
          ? await this.sdk.Renderer.takeScreenShot(res)
          : await this.sdk.Renderer.takeScreenShot()
        result = base64.startsWith("data:")
          ? base64
          : `data:image/png;base64,${base64}`
        break
      } catch {
        // try next resolution
      }
    }

    if (!result) {
      console.error("captureScreenshot: all attempts failed")
      return null
    }

    // Sample depth grid AFTER screenshot but BEFORE returning, so all depth
    // queries complete while the camera is still at the screenshot viewpoint.
    // This prevents auto-tour from moving the camera before depths resolve.
    await this.sampleDepthGrid()

    return result
  }

  /**
   * Sample a grid of depth points from the current camera viewpoint.
   * Called at screenshot time so that later 2D→3D projection uses real
   * scene geometry instead of estimated room AABB depths.
   *
   * The grid covers the full viewport in a 5×5 pattern (25 samples).
   * Each sample records the normalised screen coordinate and the
   * distance from the camera to the first surface intersection.
   */
  private async sampleDepthGrid(): Promise<void> {
    const iframeSize = this.getIframeSize()
    if (!iframeSize || !this.sdk || !this._lastPose) {
      this._screenshotDepthGrid = []
      return
    }

    const GRID = 5
    // Snapshot camera position so async depth queries use a stable value
    const camPos = { ...this._lastPose.position }
    const promises: Promise<DepthSample | null>[] = []

    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        const nx = (col + 0.5) / GRID
        const ny = (row + 0.5) / GRID
        const sx = nx * iframeSize.width
        const sy = ny * iframeSize.height

        promises.push(
          this.sdk.Renderer.getWorldPositionData({ x: sx, y: sy })
            .then((data: { position: Vector3 | null }) => {
              if (!data.position) return null
              const dx = data.position.x - camPos.x
              const dy = data.position.y - camPos.y
              const dz = data.position.z - camPos.z
              return {
                nx,
                ny,
                worldPos: data.position,
                depth: Math.sqrt(dx * dx + dy * dy + dz * dz),
              }
            })
            .catch(() => null)
        )
      }
    }

    const results = await Promise.all(promises)
    this._screenshotDepthGrid = results.filter((s): s is DepthSample => s !== null)
  }

  /**
   * Interpolate depth from the screenshot depth grid for a normalised
   * screen coordinate (0..1).  Uses inverse-distance weighting from the
   * nearest samples.  Returns null if fewer than 2 valid samples exist.
   */
  private interpolateDepthFromGrid(nx: number, ny: number): number | null {
    const grid = this._screenshotDepthGrid
    if (grid.length < 2) return null

    // Inverse-distance weighting (IDW) with p=2
    let weightSum = 0
    let depthSum = 0
    const EPSILON = 0.001

    for (const sample of grid) {
      const dx = nx - sample.nx
      const dy = ny - sample.ny
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < EPSILON) return sample.depth // Exact match

      const w = 1 / (dist * dist)
      weightSum += w
      depthSum += w * sample.depth
    }

    return weightSum > 0 ? depthSum / weightSum : null
  }

  // -----------------------------------------------------------------------
  // Camera
  // -----------------------------------------------------------------------

  getCameraPose(): CameraPose | null {
    return this._lastPose
      ? {
          ...this._lastPose,
          position: { ...this._lastPose.position },
          rotation: { ...this._lastPose.rotation },
        }
      : null
  }

  async rotateCamera(horizontal: number, vertical: number): Promise<boolean> {
    if (!this.sdk) {
      return false
    }

    try {
      await this.sdk.Camera.rotate(horizontal, vertical)
      return true
    } catch (error) {
      console.error("rotateCamera failed:", error)
      return false
    }
  }

  async setCameraRotation(rotation: Rotation): Promise<boolean> {
    if (!this.sdk) {
      return false
    }

    try {
      await this.sdk.Camera.setRotation({ ...rotation })
      return true
    } catch (error) {
      console.error("setCameraRotation failed:", error)
      return false
    }
  }

  async lookAt(
    position: Vector3,
    options?: { offset?: Vector3 }
  ): Promise<boolean> {
    if (!this.sdk) {
      return false
    }

    try {
      await this.sdk.Camera.lookAt({ ...position }, {
        offset: options?.offset ? { ...options.offset } : undefined,
      })
      return true
    } catch (error) {
      console.error("lookAt failed:", error)
      return false
    }
  }

  async zoomTo(level: number): Promise<boolean> {
    if (!this.sdk) {
      return false
    }

    try {
      await this.sdk.Camera.zoomTo(level)
      return true
    } catch (error) {
      console.error("zoomTo failed:", error)
      return false
    }
  }

  async zoomBy(delta: number): Promise<boolean> {
    if (!this.sdk) {
      return false
    }

    try {
      await this.sdk.Camera.zoomBy(delta)
      return true
    } catch (error) {
      console.error("zoomBy failed:", error)
      return false
    }
  }

  // -----------------------------------------------------------------------
  // Tag creation at pointer position (for interactive labeling)
  // -----------------------------------------------------------------------

  async addTagAtCurrentView(
    label: string,
    description: string,
    color?: { r: number; g: number; b: number }
  ): Promise<string | null> {
    if (!this.sdk || !this._lastPose) {
      return null
    }

    // Place the tag at the current camera's target point
    // Offset slightly forward from camera position in view direction
    const yaw = (this._lastPose.rotation.x * Math.PI) / 180
    const pitch = (this._lastPose.rotation.y * Math.PI) / 180
    const distance = 1.5

    const anchorPosition = {
      x: this._lastPose.position.x + Math.sin(yaw) * Math.cos(pitch) * distance,
      y: this._lastPose.position.y + Math.sin(pitch) * distance,
      z: this._lastPose.position.z - Math.cos(yaw) * Math.cos(pitch) * distance,
    }

    return this.addTag({
      label,
      description,
      anchorPosition,
      stemVector: { x: 0, y: 0.2, z: 0 },
      color,
    })
  }

  // -----------------------------------------------------------------------
  // 2D → 3D projection (screen coordinates to world position)
  // -----------------------------------------------------------------------

  /** Get the iframe display dimensions (needed for coordinate scaling). */
  getIframeSize(): { width: number; height: number } | null {
    if (!this.iframe) return null
    return { width: this.iframe.clientWidth, height: this.iframe.clientHeight }
  }

  /**
   * Raycast from a 2D screen pixel coordinate into the 3D scene.
   * Returns the first mesh intersection point, or null if the ray
   * doesn't hit any geometry.
   */
  async screenToWorld(
    screenX: number,
    screenY: number
  ): Promise<Vector3 | null> {
    if (!this.sdk) return null

    try {
      const data = await this.sdk.Renderer.getWorldPositionData({ x: screenX, y: screenY })
      return data.position
    } catch {
      return null
    }
  }

  /**
   * Convert a VLM bounding box center to a 3D world position.
   *
   * @param savedPose — Camera pose captured at screenshot time. When provided
   *   and the camera has moved since, raycast is skipped (it would hit the
   *   wrong surface) and mathematical projection is used instead.
   *
   * Pipeline:
   *   A. Camera unchanged → raycast center → multi-point sample → math fallback
   *   B. Camera moved → math projection using savedPose (PRIMARY)
   */
  async bboxToWorldPosition(
    bbox: [number, number, number, number],
    screenshotRes: { width: number; height: number },
    savedPose?: CameraPose | null
  ): Promise<Vector3 | null> {
    const effectivePose = savedPose ?? this._screenshotPose ?? this._lastPose
    if (!effectivePose) return null

    // Check if camera has moved since screenshot — if so, raycast is unreliable
    const cameraMoved = this.hasCameraMoved(effectivePose, this._lastPose)

    // ── diagnostic (remove after debugging) ──
    console.debug("[bbox→3D] bbox:", bbox, "res:", screenshotRes,
      "cameraMoved:", cameraMoved,
      "savedPose pos:", savedPose?.position, "rot:", savedPose?.rotation,
      "currentPose pos:", this._lastPose?.position, "rot:", this._lastPose?.rotation,
      "depthGrid samples:", this._screenshotDepthGrid.length)

    if (cameraMoved) {
      // Camera moved during AI analysis — use mathematical projection with saved pose
      const result = this.projectBboxWithPose(bbox, screenshotRes, effectivePose)
      console.debug("[bbox→3D] PATH: math-projection (camera moved), result:", result)
      return result
    }

    // Camera hasn't moved — raycast is accurate
    const iframeSize = this.getIframeSize()
    if (!iframeSize) {
      const result = this.projectBboxWithPose(bbox, screenshotRes, effectivePose)
      console.debug("[bbox→3D] PATH: math-projection (no iframe), result:", result)
      return result
    }

    const scaleX = iframeSize.width / screenshotRes.width
    const scaleY = iframeSize.height / screenshotRes.height

    const [x1, y1, x2, y2] = bbox
    const centerX = ((x1 + x2) / 2) * scaleX
    const centerY = ((y1 + y2) / 2) * scaleY

    // Try center point raycast
    const centerHit = await this.screenToWorld(centerX, centerY)
    if (centerHit) {
      console.debug("[bbox→3D] PATH: raycast-center, screenPt:", { centerX, centerY }, "iframeSize:", iframeSize, "result:", centerHit)
      return centerHit
    }

    // Multi-point sampling within the bbox
    const bboxW = (x2 - x1) * scaleX
    const bboxH = (y2 - y1) * scaleY
    const sampleOffsets = [
      { dx: -0.25, dy: 0 },
      { dx: 0.25, dy: 0 },
      { dx: 0, dy: -0.25 },
      { dx: 0, dy: 0.25 },
      { dx: -0.2, dy: -0.2 },
      { dx: 0.2, dy: 0.2 },
    ]

    const hits: Vector3[] = []
    for (const { dx, dy } of sampleOffsets) {
      const sx = centerX + bboxW * dx
      const sy = centerY + bboxH * dy
      if (sx < 0 || sy < 0 || sx > iframeSize.width || sy > iframeSize.height) continue
      const hit = await this.screenToWorld(sx, sy)
      if (hit) hits.push(hit)
    }

    if (hits.length > 0) {
      const result = {
        x: hits.reduce((s, h) => s + h.x, 0) / hits.length,
        y: hits.reduce((s, h) => s + h.y, 0) / hits.length,
        z: hits.reduce((s, h) => s + h.z, 0) / hits.length,
      }
      console.debug("[bbox→3D] PATH: raycast-multipoint, hits:", hits.length, "result:", result)
      return result
    }

    // All raycasts missed — mathematical fallback
    const result = this.projectBboxWithPose(bbox, screenshotRes, effectivePose)
    console.debug("[bbox→3D] PATH: math-fallback (all raycasts missed), result:", result)
    return result
  }

  /**
   * Compare two camera poses to determine if the camera has moved significantly.
   * Position threshold: 0.3m, rotation threshold: 3°.
   */
  private hasCameraMoved(
    savedPose: CameraPose,
    currentPose: CameraPose | null
  ): boolean {
    if (!currentPose) return true

    const dx = savedPose.position.x - currentPose.position.x
    const dy = savedPose.position.y - currentPose.position.y
    const dz = savedPose.position.z - currentPose.position.z
    const posDist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (posDist > 0.3) return true

    const yawDiff = Math.abs(savedPose.rotation.x - currentPose.rotation.x)
    const pitchDiff = Math.abs(savedPose.rotation.y - currentPose.rotation.y)
    if (yawDiff > 3 || pitchDiff > 3) return true

    return false
  }

  /**
   * Pinhole camera projection: cast a ray from the saved camera pose
   * through the bbox center and intersect with room geometry or place
   * at an estimated depth.
   */
  private projectBboxWithPose(
    bbox: [number, number, number, number],
    screenshotRes: { width: number; height: number },
    pose: CameraPose
  ): Vector3 | null {
    const [x1, y1, x2, y2] = bbox
    const { width, height } = screenshotRes

    // Normalize bbox center to NDC [-1, 1]
    const ndcX = (2.0 * ((x1 + x2) / 2) / width) - 1.0
    const ndcY = 1.0 - (2.0 * ((y1 + y2) / 2) / height)

    // Camera intrinsics estimate (Matterport vertical FOV ≈ 60°)
    const fovRad = (60 * Math.PI) / 180
    const tanHalfFov = Math.tan(fovRad / 2)
    const aspect = width / height

    // Camera-space ray direction
    const dirCamX = ndcX * aspect * tanHalfFov
    const dirCamY = ndcY * tanHalfFov
    const dirCamZ = -1.0

    // Rotate to world space: yaw (rotation.x), pitch (rotation.y)
    const yaw = (pose.rotation.x * Math.PI) / 180
    const pitch = (pose.rotation.y * Math.PI) / 180
    const cosY = Math.cos(yaw)
    const sinY = Math.sin(yaw)
    const cosP = Math.cos(pitch)
    const sinP = Math.sin(pitch)

    // Pitch around X, then yaw around Y.
    // Matterport yaw rotates CLOCKWISE from above (+yaw = turn right),
    // which is the OPPOSITE of the standard counter-clockwise right-hand rule,
    // so sinY terms are negated relative to the standard rotation matrix.
    const apX = dirCamX
    const apY = dirCamY * cosP - dirCamZ * sinP
    const apZ = dirCamY * sinP + dirCamZ * cosP
    const wdX = apX * cosY - apZ * sinY
    const wdY = apY
    const wdZ = apX * sinY + apZ * cosY

    const len = Math.sqrt(wdX * wdX + wdY * wdY + wdZ * wdZ)
    if (len < 1e-8) return null

    const dirNormX = wdX / len
    const dirNormY = wdY / len
    const dirNormZ = wdZ / len

    // Try depth grid first (real scene geometry captured at screenshot time),
    // fall back to room AABB intersection estimate
    const nx = ((x1 + x2) / 2) / width
    const ny = ((y1 + y2) / 2) / height
    const gridDepth = this.interpolateDepthFromGrid(nx, ny)
    const roomDepth = this.estimateDepthFromRooms(pose.position, { x: dirNormX, y: dirNormY, z: dirNormZ })
    const depth = gridDepth ?? roomDepth
    console.debug("[projectBbox] ndc:", { ndcX, ndcY }, "dir:", { x: dirNormX, y: dirNormY, z: dirNormZ },
      "gridDepth:", gridDepth, "roomDepth:", roomDepth, "depth:", depth,
      "pose:", { pos: pose.position, rot: pose.rotation })

    return {
      x: pose.position.x + dirNormX * depth,
      y: pose.position.y + dirNormY * depth,
      z: pose.position.z + dirNormZ * depth,
    }
  }

  /**
   * Estimate ray depth by intersecting with known room AABB bounds.
   * Returns the nearest valid intersection distance, or a default of 2.5m.
   */
  private estimateDepthFromRooms(
    origin: Vector3,
    dir: Vector3
  ): number {
    const DEFAULT_DEPTH = 2.5
    if (this._rooms.length === 0) return DEFAULT_DEPTH

    let bestT = Infinity

    for (const room of this._rooms) {
      if (!room.bounds?.min || !room.bounds?.max) continue
      const t = this.rayAABBIntersect(origin, dir, room.bounds.min, room.bounds.max)
      if (t !== null && t > 0.2 && t < bestT) {
        bestT = t
      }
    }

    return bestT < Infinity ? bestT : DEFAULT_DEPTH
  }

  /**
   * Ray-AABB slab intersection test.
   * Returns the distance along the ray to the nearest intersection, or null.
   */
  private rayAABBIntersect(
    origin: Vector3,
    dir: Vector3,
    bmin: Vector3,
    bmax: Vector3
  ): number | null {
    let tmin = -Infinity
    let tmax = Infinity

    for (const axis of ["x", "y", "z"] as const) {
      const d = dir[axis]
      const o = origin[axis]
      const lo = bmin[axis]
      const hi = bmax[axis]

      if (Math.abs(d) < 1e-9) {
        if (o < lo || o > hi) return null
        continue
      }

      let t1 = (lo - o) / d
      let t2 = (hi - o) / d
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp }

      tmin = Math.max(tmin, t1)
      tmax = Math.min(tmax, t2)

      if (tmin > tmax) return null
    }

    // Return the exit distance (the far intersection point — where the ray
    // hits the far wall of the room). If origin is inside the AABB, tmin < 0
    // and tmax is the exit point.
    return tmax > 0 ? tmax : null
  }

  // -----------------------------------------------------------------------
  // Directional navigation (WASD FPS-style)
  // -----------------------------------------------------------------------

  async navigateInDirection(
    direction: "forward" | "backward"
  ): Promise<boolean> {
    if (!this.sdk || !this._currentSweep || !this._lastPose) {
      return false
    }

    const yawDeg = this._lastPose.rotation.x
    const yaw = (yawDeg * Math.PI) / 180
    const sign = direction === "forward" ? 1 : -1

    const dirX = Math.sin(yaw) * sign
    const dirZ = -Math.cos(yaw) * sign

    const current = this._currentSweep
    const currentFloorSeq = current.floorInfo?.sequence

    // STRICTLY use neighbor graph — only physically connected sweeps
    const candidates = current.neighbors
      .map((sid) => this._sweeps.find((s) => s.sid === sid))
      .filter((s): s is SweepData => {
        if (s == null || !s.enabled) return false
        // Floor check: never navigate to a different floor via WASD
        if (currentFloorSeq != null && s.floorInfo?.sequence != null) {
          if (s.floorInfo.sequence !== currentFloorSeq) return false
        }
        return true
      })

    if (candidates.length === 0) {
      return false
    }

    // Separate candidates: same room vs cross-room (doorway transitions)
    const currentRoomInferred = this.inferRoomFromPosition(current.position)
    const currentRoomId = currentRoomInferred?.id
    const sameRoom: Array<{ sweep: SweepData; score: number }> = []
    const crossRoom: Array<{ sweep: SweepData; score: number }> = []

    for (const sweep of candidates) {
      const dx = sweep.position.x - current.position.x
      const dz = sweep.position.z - current.position.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < 0.01) continue

      const dot = (dx / dist) * dirX + (dz / dist) * dirZ

      // Reject sweeps behind the camera (dot <= 0 means wrong direction)
      if (dot <= 0) continue

      // Score: direction alignment weighted by proximity (closer = better)
      const proximityBonus = 1 / (1 + dist)
      const score = dot * (1 + proximityBonus * 0.3)

      // Room boundary check: verify the midpoint lies within a known room
      if (!this.isPathClearOfWalls(current.position, sweep.position)) continue

      const sweepRoom = this.inferRoomFromPosition(sweep.position)
      const bucket =
        currentRoomId != null && sweepRoom?.id === currentRoomId
          ? sameRoom
          : crossRoom
      bucket.push({ sweep, score })
    }

    // Prefer same-room sweeps; fall back to cross-room (doorway) only if
    // no same-room candidate aligns with the desired direction
    const pool = sameRoom.length > 0 ? sameRoom : crossRoom
    if (pool.length === 0) {
      return false
    }

    // Pick highest-scoring candidate
    let best = pool[0]
    for (let i = 1; i < pool.length; i++) {
      if (pool[i].score > best.score) {
        best = pool[i]
      }
    }

    return this.navigateToSweep(best.sweep.sid, { transition: "fly" })
  }

  /**
   * Check whether the straight-line path between two positions crosses a
   * room boundary wall. Uses room AABB bounds as a rough spatial partition.
   *
   * Heuristic: the midpoint of the path should lie within the bounds of at
   * least one known room. If it falls outside all rooms, the path likely
   * crosses a wall.
   */
  private isPathClearOfWalls(from: Vector3, to: Vector3): boolean {
    if (this._rooms.length === 0) {
      // No room data loaded yet — allow navigation (graceful fallback)
      return true
    }

    const mid: Vector3 = {
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2,
      z: (from.z + to.z) / 2,
    }

    return this._rooms.some(
      (room) =>
        mid.x >= room.bounds.min.x &&
        mid.x <= room.bounds.max.x &&
        mid.y >= room.bounds.min.y &&
        mid.y <= room.bounds.max.y &&
        mid.z >= room.bounds.min.z &&
        mid.z <= room.bounds.max.z
    )
  }

  /**
   * Find which room a 3D position falls within, using AABB bounds.
   * Returns the best-fit room or undefined if outside all rooms.
   */
  private inferRoomFromPosition(pos: Vector3): RoomData | undefined {
    let bestRoom: RoomData | undefined
    let bestVolume = Infinity

    for (const room of this._rooms) {
      if (!room.bounds?.min || !room.bounds?.max) continue
      const b = room.bounds
      if (
        pos.x >= b.min.x && pos.x <= b.max.x &&
        pos.y >= b.min.y && pos.y <= b.max.y &&
        pos.z >= b.min.z && pos.z <= b.max.z
      ) {
        // If position is inside multiple overlapping rooms, pick the smallest
        const vol =
          (b.max.x - b.min.x) *
          (b.max.y - b.min.y) *
          (b.max.z - b.min.z)
        if (vol < bestVolume) {
          bestVolume = vol
          bestRoom = room
        }
      }
    }

    return bestRoom
  }

  // -----------------------------------------------------------------------
  // Tag editing (in-place, without remove+add)
  // -----------------------------------------------------------------------

  async editTagLabel(
    tagId: string,
    label: string,
    description?: string
  ): Promise<boolean> {
    if (!this.sdk) {
      return false
    }

    try {
      const props: Partial<{ label: string; description: string }> = { label }
      if (description !== undefined) {
        props.description = description
      }
      await this.sdk.Tag.editBillboard(tagId, props)
      return true
    } catch (error) {
      console.error("editTagLabel failed:", error)
      return false
    }
  }

  async editTagColor(
    tagId: string,
    color: { r: number; g: number; b: number }
  ): Promise<boolean> {
    if (!this.sdk) {
      return false
    }

    try {
      await this.sdk.Tag.editColor(tagId, { ...color })
      return true
    } catch (error) {
      console.error("editTagColor failed:", error)
      return false
    }
  }

  async editTagPosition(
    tagId: string,
    anchorPosition: Vector3,
    stemVector?: Vector3
  ): Promise<boolean> {
    if (!this.sdk) {
      return false
    }

    try {
      const options: Partial<{ anchorPosition: Vector3; stemVector: Vector3 }> = {
        anchorPosition: { ...anchorPosition },
      }
      if (stemVector) {
        options.stemVector = { ...stemVector }
      }
      await this.sdk.Tag.editPosition(tagId, options)
      return true
    } catch (error) {
      console.error("editTagPosition failed:", error)
      return false
    }
  }

  async editTagOpacity(tagId: string, opacity: number): Promise<boolean> {
    if (!this.sdk) {
      return false
    }

    try {
      await this.sdk.Tag.editOpacity(tagId, opacity)
      return true
    } catch (error) {
      console.error("editTagOpacity failed:", error)
      return false
    }
  }

  /** Hide all SDK tags except the given one (for focused editing). */
  async focusTag(activeTagId: string | null): Promise<void> {
    if (!this.sdk) return
    for (const [, tagId] of this.annotationToTagId.entries()) {
      if (activeTagId && tagId !== activeTagId) {
        void this.editTagOpacity(tagId, 0.0)
      } else {
        void this.editTagOpacity(tagId, 1.0)
      }
    }
  }

  /** Restore all tags to full opacity and visibility. */
  async unfocusAllTags(): Promise<void> {
    if (!this.sdk) return
    for (const tagId of this.annotationToTagId.values()) {
      void this.editTagOpacity(tagId, 1.0)
    }
  }

  /** Get the tag ID associated with an annotation. */
  getTagIdForAnnotation(annotationId: string): string | undefined {
    return this.annotationToTagId.get(annotationId)
  }

  async navigateToTag(tagId: string): Promise<boolean> {
    if (!this.sdk) {
      return false
    }

    try {
      // Find the tag's anchor position and navigate to the nearest sweep
      const tag = this._tags.find((t) => t.id === tagId)
      if (tag) {
        const nearest = this.findNearestSweep(tag.anchorPosition)
        if (nearest) {
          await this.sdk.Sweep.moveTo(nearest.sid, {
            transitionTime: 1200,
          })
          return true
        }
      }
      // Fallback: try opening the tag (which may also navigate)
      await this.sdk.Tag.open(tagId)
      return true
    } catch (error) {
      console.error("navigateToTag failed:", error)
      return false
    }
  }

  private findNearestSweep(pos: Vector3): SweepData | null {
    let best: SweepData | null = null
    let bestDist = Infinity
    for (const sweep of this._sweeps) {
      if (!sweep.enabled) continue
      const dx = sweep.position.x - pos.x
      const dy = sweep.position.y - pos.y
      const dz = sweep.position.z - pos.z
      const dist = dx * dx + dy * dy + dz * dz
      if (dist < bestDist) {
        bestDist = dist
        best = sweep
      }
    }
    return best
  }

  async openTag(tagId: string): Promise<boolean> {
    if (!this.sdk) {
      return false
    }

    try {
      await this.sdk.Tag.open(tagId)
      return true
    } catch (error) {
      console.error("openTag failed:", error)
      return false
    }
  }

  async closeTag(tagId: string): Promise<boolean> {
    if (!this.sdk) {
      return false
    }

    try {
      await this.sdk.Tag.close(tagId)
      return true
    } catch (error) {
      console.error("closeTag failed:", error)
      return false
    }
  }

  // -----------------------------------------------------------------------
  // Tour: jump to specific step
  // -----------------------------------------------------------------------

  async stepTour(index: number): Promise<boolean> {
    if (!this.sdk) {
      return false
    }

    // Use predefined tour if snapshots are loaded
    if (this._tourSnapshots.length > 0) {
      // SDK Tour.step() requires the tour to be started first —
      // otherwise the SDK may switch to dollhouse mode or silently fail.
      if (!this._sdkTourStarted) {
        try {
          await this.sdk.Tour.start(index)
          this._sdkTourStarted = true
          return true
        } catch {
          // Tour.start() failed — fall through to sweep-based navigation
        }
      } else {
        try {
          await this.sdk.Tour.step(index)
          return true
        } catch (error) {
          console.error("stepTour failed:", error)
          // Fall through to sweep-based navigation
        }
      }
    }

    // Fallback: navigate to sweep positions directly
    const sweeps = this.getSweepsForTour()
    const sweep = sweeps[index]
    if (!sweep) return false
    return this.navigateToSweep(sweep.sid, { transition: "fly" })
  }

  /**
   * Returns a curated list of enabled sweeps suitable for an auto-tour.
   * If the model has predefined tour snapshots, those should be preferred.
   * This is the sweep-based fallback used when Tour.getData() returns [].
   */
  getSweepsForTour(maxStops = 20): SweepData[] {
    const enabled = this._sweeps.filter((s) => s.enabled)
    if (enabled.length === 0) return []
    if (enabled.length <= maxStops) return [...enabled]

    // Sample evenly so the tour covers the whole space systematically
    const step = Math.floor(enabled.length / maxStops)
    return enabled.filter((_, i) => i % step === 0).slice(0, maxStops)
  }

  // -----------------------------------------------------------------------
  // Floor: show all floors
  // -----------------------------------------------------------------------

  async showAllFloors(): Promise<boolean> {
    if (!this.sdk) {
      return false
    }

    try {
      await this.sdk.Floor.showAll()
      return true
    } catch (error) {
      console.error("showAllFloors failed:", error)
      return false
    }
  }

  // -----------------------------------------------------------------------
  // Pointer / Raycasting
  // -----------------------------------------------------------------------

  async getWorldPosition(
    screenX: number,
    screenY: number
  ): Promise<{ position: Vector3 | null; floor: number } | null> {
    if (!this.sdk) {
      return null
    }

    try {
      const data = await this.sdk.Renderer.getWorldPositionData({
        x: screenX,
        y: screenY,
      })
      return { position: data.position, floor: data.floor }
    } catch (error) {
      console.error("getWorldPosition failed:", error)
      return null
    }
  }

  // -----------------------------------------------------------------------
  // Model metadata
  // -----------------------------------------------------------------------

  async getModelDetails(): Promise<ModelDetails | null> {
    if (!this.sdk) {
      return null
    }

    try {
      return await this.sdk.Model.getDetails()
    } catch (error) {
      console.error("getModelDetails failed:", error)
      return null
    }
  }

  // -----------------------------------------------------------------------
  // Screenshot with visibility control
  // -----------------------------------------------------------------------

  async captureCleanScreenshot(
    resolution?: ScreenshotResolution
  ): Promise<string | null> {
    if (!this.sdk) {
      return null
    }

    try {
      const effectiveResolution = resolution
        ? { ...resolution }
        : { width: 1920, height: 1080 }

      const base64 = await this.sdk.Renderer.takeScreenShot(
        effectiveResolution,
        { measurements: false, mattertags: false, sweeps: false, views: false }
      )
      return base64.startsWith("data:")
        ? base64
        : `data:image/png;base64,${base64}`
    } catch (error) {
      console.error("captureCleanScreenshot failed:", error)
      return null
    }
  }

  // -----------------------------------------------------------------------
  // State observable subscriptions
  // -----------------------------------------------------------------------

  subscribe(listener: AnnotationListener): () => void {
    this.annotationListeners.add(listener)
    return () => {
      this.annotationListeners.delete(listener)
    }
  }

  onSweepChange(cb: SweepChangeCallback): () => void {
    this.sweepChangeCallbacks.add(cb)
    return () => {
      this.sweepChangeCallbacks.delete(cb)
    }
  }

  onRoomChange(cb: RoomChangeCallback): () => void {
    this.roomChangeCallbacks.add(cb)
    return () => {
      this.roomChangeCallbacks.delete(cb)
    }
  }

  onModeChange(cb: ModeChangeCallback): () => void {
    this.modeChangeCallbacks.add(cb)
    return () => {
      this.modeChangeCallbacks.delete(cb)
    }
  }

  onTourStep(cb: TourStepCallback): () => void {
    this.tourStepCallbacks.add(cb)
    return () => {
      this.tourStepCallbacks.delete(cb)
    }
  }

  onTourStateChange(cb: TourStateChangeCallback): () => void {
    this.tourStateChangeCallbacks.add(cb)
    return () => {
      this.tourStateChangeCallbacks.delete(cb)
    }
  }

  onFloorChange(cb: FloorChangeCallback): () => void {
    this.floorChangeCallbacks.add(cb)
    return () => {
      this.floorChangeCallbacks.delete(cb)
    }
  }

  onPointerMove(cb: PointerCallback): () => void {
    this.pointerCallbacks.add(cb)
    return () => {
      this.pointerCallbacks.delete(cb)
    }
  }

  // -----------------------------------------------------------------------
  // Private: SDK subscriptions setup / teardown
  // -----------------------------------------------------------------------

  private initSubscriptions(): void {
    const sdk = this.sdk
    if (!sdk) {
      return
    }

    // Camera pose — deep-copy position/rotation to prevent SDK from
    // mutating our stored pose when the camera moves later.
    const poseSub = sdk.Camera.pose.subscribe((pose: CameraPose) => {
      this._lastPose = {
        ...pose,
        position: { ...pose.position },
        rotation: { ...pose.rotation },
      }
    })
    this.subscriptions = [...this.subscriptions, poseSub]

    // Current sweep — also infer room from sweep position when SDK Room.current
    // doesn't fire (some models lack proper room boundaries)
    const currentSweepSub = sdk.Sweep.current.subscribe((sweep: SweepData) => {
      this._currentSweep = { ...sweep }
      for (const cb of this.sweepChangeCallbacks) {
        cb({ ...sweep })
      }

      // Infer room from sweep position via bounds check
      if (sweep.sid && this._rooms.length > 0) {
        const inferred = this.inferRoomFromPosition(sweep.position)
        if (inferred) {
          const prevRoomId = this._currentRoom?.id
          if (inferred.id !== prevRoomId) {
            this._currentRoom = { ...inferred }
            for (const cb of this.roomChangeCallbacks) {
              cb({ ...inferred })
            }
          }
        }
      }
    })
    this.subscriptions = [...this.subscriptions, currentSweepSub]

    // Current room — SDK returns { rooms: SdkRoomData[] }
    const currentRoomSub = sdk.Room.current.subscribe(
      (data: CurrentRooms) => {
        const sdkRoom = data?.rooms?.[0]
        const mapped: RoomData | undefined = sdkRoom
          ? { id: sdkRoom.id, name: sdkRoom.label ?? sdkRoom.id, bounds: sdkRoom.bounds }
          : undefined
        const prevId = this._currentRoom?.id
        if (mapped?.id !== prevId) {
          this._currentRoom = mapped
          for (const cb of this.roomChangeCallbacks) {
            cb(mapped)
          }
        }
      }
    )
    this.subscriptions = [...this.subscriptions, currentRoomSub]

    // Current floor
    const floorSub = sdk.Floor.current.subscribe(
      (floor: { id: string; sequence: number } | undefined) => {
        this._currentFloor = floor ? { ...floor } : undefined
        for (const cb of this.floorChangeCallbacks) {
          cb(floor ? { ...floor } : undefined)
        }
      }
    )
    this.subscriptions = [...this.subscriptions, floorSub]

    // Tour events
    sdk.on(sdk.Tour.Event.STARTED, () => {
      this._isTourActive = true
      for (const cb of this.tourStateChangeCallbacks) {
        cb(true)
      }
    })
    sdk.on(sdk.Tour.Event.STOPPED, () => {
      this._isTourActive = false
      for (const cb of this.tourStateChangeCallbacks) {
        cb(false)
      }
    })
    sdk.on(sdk.Tour.Event.STEPPED, (stepIndex: unknown) => {
      this._isTourActive = true
      for (const cb of this.tourStepCallbacks) {
        cb(stepIndex as number)
      }
    })

    // Mode change events — map SDK mode strings to ViewMode
    sdk.on(sdk.Mode.Event.CHANGE_END, (mode: unknown) => {
      const sdkMode = mode as string
      this._currentMode = sdkMode
      const viewMode = this.sdkModeToViewMode(sdkMode)
      for (const cb of this.modeChangeCallbacks) {
        cb(viewMode)
      }
    })

    // Tag click — find matching annotation and broadcast event
    // Matterport SDK may expose Tag.Event or use string event names
    const tagClickEvent = sdk.Tag.Event?.CLICK ?? "tag.click"
    try {
      sdk.on(tagClickEvent, (tagSid: unknown) => {
        const clickedTagId = String(tagSid)
        for (const [annId, tId] of this.annotationToTagId.entries()) {
          if (tId === clickedTagId) {
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("annotation-tag-clicked", { detail: { annotationId: annId } })
              )
            }
            break
          }
        }
      })
    } catch {
      // Tag click events not supported in this SDK version
    }

    // Pointer intersection — real-time 3D raycast under cursor
    if (sdk.Pointer) {
      const pointerSub = sdk.Pointer.intersection.subscribe(
        (intersection: PointerIntersection) => {
          // Deep-copy position/normal so SDK can't mutate our stored values
          const snapshot = {
            ...intersection,
            position: { ...intersection.position },
            normal: { ...intersection.normal },
          }
          for (const cb of this.pointerCallbacks) {
            cb(snapshot)
          }
        }
      )
      this.subscriptions = [...this.subscriptions, pointerSub]
    }
  }

  private async loadModelData(): Promise<void> {
    const sdk = this.sdk
    if (!sdk) {
      return
    }

    // Load sweeps via collection observable
    const sweepSub = sdk.Sweep.data.subscribe({
      onCollectionUpdated: (collection) => {
        if (collection instanceof Map) {
          this._sweeps = Array.from(collection.values())
        } else {
          this._sweeps = [...collection]
        }
      },
    })
    this.subscriptions = [...this.subscriptions, sweepSub]

    // Load rooms via collection observable — SDK rooms use `label`, map to our `name`
    // Guard: only update if the new collection is non-empty to prevent clearing
    // on interim empty-collection events that the SDK sometimes emits.
    const roomSub = sdk.Room.data.subscribe({
      onCollectionUpdated: (collection) => {
        const sdkRooms: SdkRoomData[] = collection instanceof Map
          ? Array.from(collection.values())
          : [...collection]
        if (sdkRooms.length > 0) {
          this._rooms = sdkRooms.map((r) => ({
            id: r.id,
            name: r.label ?? r.id,
            bounds: r.bounds,
          }))
        }
      },
    })
    this.subscriptions = [...this.subscriptions, roomSub]

    // Load floors via getData (returns promise)
    try {
      this._floors = await sdk.Floor.getData()
    } catch (error) {
      console.error("Failed to load floor data:", error)
      this._floors = []
    }

    // Load tags via collection observable
    const tagSub = sdk.Tag.data.subscribe({
      onCollectionUpdated: (collection) => {
        if (collection instanceof Map) {
          this._tags = Array.from(collection.values())
        } else {
          this._tags = [...collection]
        }
      },
    })
    this.subscriptions = [...this.subscriptions, tagSub]

    // Load tour snapshots
    try {
      this._tourSnapshots = await sdk.Tour.getData()
    } catch {
      this._tourSnapshots = []
    }

    // Load model details
    try {
      this._modelDetails = await sdk.Model.getDetails()
    } catch {
      this._modelDetails = null
    }
  }

  private teardownSubscriptions(): void {
    for (const sub of this.subscriptions) {
      sub.cancel()
    }
    this.subscriptions = []

    // Remove event listeners
    if (this.sdk) {
      try {
        this.sdk.off(this.sdk.Tour.Event.STARTED, () => {})
        this.sdk.off(this.sdk.Tour.Event.STOPPED, () => {})
        this.sdk.off(this.sdk.Tour.Event.STEPPED, () => {})
        this.sdk.off(this.sdk.Mode.Event.CHANGE_END, () => {})
      } catch {
        // SDK already torn down — safe to ignore
      }
    }
  }

  // -----------------------------------------------------------------------
  // Private: SDK mode mapping
  // -----------------------------------------------------------------------

  private sdkModeToViewMode(sdkMode: string): ViewMode {
    if (!this.sdk) {
      return "inside"
    }
    if (sdkMode === this.sdk.Mode.Mode.DOLLHOUSE) {
      return "dollhouse"
    }
    if (sdkMode === this.sdk.Mode.Mode.FLOORPLAN) {
      return "floorplan"
    }
    return "inside"
  }

  // -----------------------------------------------------------------------
  // Private: Annotation notification
  // -----------------------------------------------------------------------

  private notifyAnnotationListeners(): void {
    const current = this.getAnnotations()
    for (const listener of this.annotationListeners) {
      listener(current)
    }
  }
}

// ---------------------------------------------------------------------------
// Utility: hex color to RGB
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace(/^#/, "")
  const fullHex =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned

  const num = parseInt(fullHex, 16)
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  }
}
