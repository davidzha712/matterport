import type { SpaceRecord } from "@/lib/mock-data"

type EmbedStatus = {
  label: string
  modelSid?: string
  sdkKeyStatus: "missing" | "available"
  state: "connected" | "standby"
}

export function getMatterportEmbedStatus(space: SpaceRecord): EmbedStatus {
  const envModelSid = process.env.NEXT_PUBLIC_MATTERPORT_MODEL_SID
  const modelSid = space.matterportModelSid ?? envModelSid
  const sdkKeyStatus = process.env.NEXT_PUBLIC_MATTERPORT_SDK_KEY ? "available" : "missing"

  if (modelSid && sdkKeyStatus === "available") {
    return {
      label: "Live-ready",
      modelSid,
      sdkKeyStatus,
      state: "connected"
    }
  }

  return {
    label: "Design mode",
    modelSid,
    sdkKeyStatus,
    state: "standby"
  }
}

export function getMatterportEmbedUrl(modelSid: string) {
  const search = new URLSearchParams({
    m: modelSid,
    play: "1",
    qs: "1",
    brand: "0",
    title: "0",
    help: "0",
    mt: "0"
  })

  return `https://my.matterport.com/show/?${search.toString()}`
}

