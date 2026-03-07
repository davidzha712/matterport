import { describe, expect, it } from "vitest"
import type { SpaceRecord } from "../src/lib/mock-data"
import { getMatterportEmbedStatus, getMatterportEmbedUrl } from "../src/lib/matterport"

const baseSpace: SpaceRecord = {
  id: "estate-library",
  name: "Estate Library",
  objects: [],
  projectId: "estate-archive",
  projectName: "Estate Archive",
  rooms: [],
  summary: "Reference space"
}

describe("Matterport helpers", () => {
  it("treats a space with a model sid as live-capable", () => {
    const status = getMatterportEmbedStatus({
      ...baseSpace,
      matterportModelSid: "oyaicKWaEQw"
    })

    expect(status.state).toBe("connected")
    expect(status.modelSid).toBe("oyaicKWaEQw")
  })

  it("keeps a space without a model sid in design mode", () => {
    const status = getMatterportEmbedStatus(baseSpace)

    expect(status.state).toBe("standby")
    expect(status.modelSid).toBeUndefined()
  })

  it("adds the application key to the showcase url when available", () => {
    const url = getMatterportEmbedUrl("oyaicKWaEQw", "sdk-demo-key")

    expect(url).toContain("m=oyaicKWaEQw")
    expect(url).toContain("applicationKey=sdk-demo-key")
  })
})

