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
    gt: "0",
    hr: "0",
    f: "0",
    mls: "2",
    mt: "0",
    dh: "0",
    fp: "0",
  }

  if (sdkKey) {
    params.applicationKey = sdkKey
  }

  const search = new URLSearchParams(params)
  return `https://my.matterport.com/show/?${search.toString()}`
}
