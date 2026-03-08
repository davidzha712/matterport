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
    gt: "1",    // guided tour enabled
    hr: "1",    // highlight reel enabled
    f: "1",     // fullscreen enabled
    mls: "2",
    mt: "1",    // mattertags (3D labels) enabled
    dh: "1",    // dollhouse mode enabled
    fp: "1",    // floorplan mode enabled
  }

  if (sdkKey) {
    params.applicationKey = sdkKey
  }

  const search = new URLSearchParams(params)
  return `https://my.matterport.com/show/?${search.toString()}`
}
