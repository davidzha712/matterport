import type { SpaceRecord } from "@/lib/platform-types"

type EmbedStatus = {
  label: string
  modelSid?: string
  sdkKeyStatus: "missing" | "available"
  state: "connected" | "standby"
}

export function getMatterportEmbedStatus(space: SpaceRecord): EmbedStatus {
  const modelSid = space.matterportModelSid
  const sdkKeyStatus = process.env.NEXT_PUBLIC_MATTERPORT_SDK_KEY ? "available" : "missing"

  if (modelSid) {
    return {
      label: sdkKeyStatus === "available" ? "SDK bereit" : "Viewer bereit",
      modelSid,
      sdkKeyStatus,
      state: "connected"
    }
  }

  return {
    label: "Design-Modus",
    modelSid,
    sdkKeyStatus,
    state: "standby"
  }
}

export function getMatterportEmbedUrl(modelSid: string): string {
  const sdkKey = process.env.NEXT_PUBLIC_MATTERPORT_SDK_KEY

  const params: Record<string, string> = {
    m: modelSid,
    play: "1",
    qs: "1",
    brand: "0",
    title: "0",
    help: "0",
    gt: "0",    // guided tour button hidden (we have our own)
    hr: "0",    // highlight reel hidden
    f: "0",     // fullscreen button hidden
    mls: "2",   // mattertag label style: disc
    mt: "1",    // mattertags (3D labels) enabled
    dh: "1",    // dollhouse mode enabled (SDK controlled)
    fp: "1",    // floorplan mode enabled (SDK controlled)
    ts: "0",      // hide toolbar strip (bottom-left controls including measurement)
    nozoom: "1",  // hide zoom controls
    pin: "0",     // disable pin
    portal: "0",  // disable portals
    vr: "0",      // hide VR button
    search: "0",  // hide search
    gs: "0",      // hide getting started
    views: "0",   // hide views panel
    lp: "0",      // hide labeled pins UI
    nt: "1",      // no title bar
  }

  if (sdkKey) {
    params.applicationKey = sdkKey
  }

  const search = new URLSearchParams(params)
  return `https://my.matterport.com/show/?${search.toString()}`
}
