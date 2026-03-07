import type { SpaceRecord } from "@/lib/mock-data"

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

export function getMatterportEmbedUrl(modelSid: string, sdkKey?: string) {
  const search = new URLSearchParams({
    m: modelSid,
    play: "1",
    qs: "1",
    brand: "0",
    title: "0",
    help: "0",
    mt: "0"
  })

  if (sdkKey) {
    search.set("applicationKey", sdkKey)
  }

  return `https://my.matterport.com/show/?${search.toString()}`
}
