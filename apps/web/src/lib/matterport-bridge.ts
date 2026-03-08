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

interface SweepData {
  sid: string
  position: Vector3
  floorInfo: { id: string; sequence: number } | undefined
  room: string | undefined
  neighbors: string[]
  enabled: boolean
}

interface FloorData {
  id: string
  name: string
  sequence: number
}

interface RoomData {
  id: string
  name: string
  bounds: { min: Vector3; max: Vector3 }
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
    data: CollectionObservable<TagData>
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
    current: Observable<RoomData | undefined>
    data: CollectionObservable<RoomData>
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
      unused?: string
    ) => Promise<MpSdk>
  }
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type BridgeStatus = "disconnected" | "iframe-only" | "sdk-connected"
export type ViewMode = "inside" | "dollhouse" | "floorplan"
export type { PointerIntersection, ModelDetails, RoomData, SweepData, FloorData, TagData, TourSnapshot }

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

  private _sweeps: SweepData[] = []
  private _rooms: RoomData[] = []
  private _floors: FloorData[] = []
  private _tags: TagData[] = []
  private _tourSnapshots: TourSnapshot[] = []
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

  // -----------------------------------------------------------------------
  // Connection lifecycle
  // -----------------------------------------------------------------------

  async attachIframe(iframe: HTMLIFrameElement): Promise<void> {
    this.iframe = iframe
    this._status = "iframe-only"

    const sdkKey = process.env.NEXT_PUBLIC_MATTERPORT_SDK_KEY
    if (!sdkKey) {
      return
    }

    try {
      const embeddingWindow = window as unknown as ShowcaseEmbedWindow
      if (!embeddingWindow.MP_SDK) {
        return
      }

      const mpSdk = await embeddingWindow.MP_SDK.connect(iframe, sdkKey)
      this.sdk = mpSdk
      this._status = "sdk-connected"

      this.initSubscriptions()
      await this.loadModelData()
    } catch (error) {
      // SDK connection failed — stay in iframe-only mode
      console.error("Matterport SDK connection failed:", error)
    }
  }

  detach(): void {
    this.teardownSubscriptions()
    this.sdk = null
    this.iframe = null
    this._status = "disconnected"
    this._isTourActive = false
    this._currentSweep = null
    this._currentRoom = undefined
    this._currentMode = ""
    this._currentFloor = undefined
    this._lastPose = null
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

    // Find sweeps belonging to this room
    const roomSweeps = this._sweeps.filter(
      (sweep) => sweep.room === roomId && sweep.enabled
    )
    if (roomSweeps.length === 0) {
      return false
    }

    // Pick the first enabled sweep in this room
    return this.navigateToSweep(roomSweeps[0].sid, { transition: "fly" })
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

    try {
      await this.sdk.Mode.moveTo(modeMap[mode], {
        transition: this.sdk.Mode.TransitionType.FLY,
      })
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
    } catch (error) {
      console.error("startTour failed:", error)
      return false
    }
  }

  async stopTour(): Promise<boolean> {
    if (!this.sdk) {
      return false
    }

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
    } catch (error) {
      console.error("nextTourStep failed:", error)
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
    } catch (error) {
      console.error("prevTourStep failed:", error)
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
  }): Promise<string | null> {
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
      return ids[0] ?? null
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
      return true
    } catch (error) {
      console.error("removeTag failed:", error)
      return false
    }
  }

  // -----------------------------------------------------------------------
  // Annotations (local state + optional SDK tag sync)
  // -----------------------------------------------------------------------

  addAnnotation(data: Omit<SpatialAnnotation, "id">): SpatialAnnotation {
    const annotation: SpatialAnnotation = {
      ...data,
      id: `ann_${crypto.randomUUID().slice(0, 8)}`,
    }
    this.annotations = new Map(this.annotations).set(annotation.id, annotation)
    this.notifyAnnotationListeners()

    // Sync to SDK tag if connected
    if (this.sdk) {
      const hexColor = annotation.color ?? "#ff3333"
      const rgb = hexToRgb(hexColor)

      this.addTag({
        label: annotation.label,
        description: annotation.description,
        anchorPosition: { ...annotation.position },
        color: rgb,
      }).then((tagId) => {
        if (tagId) {
          this.annotationToTagId = new Map(this.annotationToTagId).set(
            annotation.id,
            tagId
          )
        }
      })
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

          this.addTag({
            label: updated.label,
            description: updated.description,
            anchorPosition: { ...updated.position },
            color: rgb,
          }).then((newTagId) => {
            if (newTagId) {
              this.annotationToTagId = new Map(this.annotationToTagId).set(
                id,
                newTagId
              )
            }
          })
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

    try {
      const effectiveResolution = resolution
        ? { ...resolution }
        : { width: 1920, height: 1080 }

      const base64 = await this.sdk.Renderer.takeScreenShot(effectiveResolution)
      return base64.startsWith("data:")
        ? base64
        : `data:image/png;base64,${base64}`
    } catch (error) {
      console.error("captureScreenshot failed:", error)
      return null
    }
  }

  // -----------------------------------------------------------------------
  // Camera
  // -----------------------------------------------------------------------

  getCameraPose(): CameraPose | null {
    return this._lastPose ? { ...this._lastPose } : null
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
    const currentRoomId = current.room
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

      const bucket =
        currentRoomId != null && sweep.room === currentRoomId
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

  async navigateToTag(tagId: string): Promise<boolean> {
    if (!this.sdk) {
      return false
    }

    try {
      await this.sdk.Mattertag.navigateToTag(tagId)
      return true
    } catch (error) {
      console.error("navigateToTag failed:", error)
      return false
    }
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

    try {
      await this.sdk.Tour.step(index)
      return true
    } catch (error) {
      console.error("stepTour failed:", error)
      return false
    }
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

    // Camera pose
    const poseSub = sdk.Camera.pose.subscribe((pose: CameraPose) => {
      this._lastPose = { ...pose }
    })
    this.subscriptions = [...this.subscriptions, poseSub]

    // Current sweep
    const sweepSub = sdk.Sweep.current.subscribe((sweep: SweepData) => {
      this._currentSweep = { ...sweep }
      for (const cb of this.sweepChangeCallbacks) {
        cb({ ...sweep })
      }
    })
    this.subscriptions = [...this.subscriptions, sweepSub]

    // Current room
    const roomSub = sdk.Room.current.subscribe(
      (room: RoomData | undefined) => {
        this._currentRoom = room ? { ...room } : undefined
        for (const cb of this.roomChangeCallbacks) {
          cb(room ? { ...room } : undefined)
        }
      }
    )
    this.subscriptions = [...this.subscriptions, roomSub]

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

    // Pointer intersection — real-time 3D raycast under cursor
    if (sdk.Pointer) {
      const pointerSub = sdk.Pointer.intersection.subscribe(
        (intersection: PointerIntersection) => {
          for (const cb of this.pointerCallbacks) {
            cb({ ...intersection })
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

    // Load rooms via collection observable
    const roomSub = sdk.Room.data.subscribe({
      onCollectionUpdated: (collection) => {
        if (collection instanceof Map) {
          this._rooms = Array.from(collection.values())
        } else {
          this._rooms = [...collection]
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
