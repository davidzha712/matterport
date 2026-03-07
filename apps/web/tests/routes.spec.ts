import { describe, expect, it } from "vitest";

import {
  buildObjectRoute,
  buildRoomRoute,
  buildSpaceRoute,
  immersiveModes,
  resolveImmersiveMode,
} from "../src/lib/routes";

describe("immersive route helpers", () => {
  it("exposes the five supported immersive modes for the shared shell", () => {
    expect(immersiveModes).toEqual(["explore", "work", "story", "review", "listing"]);
  });

  it("builds canonical mode-aware space routes", () => {
    expect(buildSpaceRoute("estate-grand-hall", "explore")).toBe(
      "/spaces/estate-grand-hall/explore",
    );
    expect(buildSpaceRoute("estate-grand-hall", "work")).toBe(
      "/spaces/estate-grand-hall/work",
    );
    expect(buildSpaceRoute("estate-grand-hall", "listing")).toBe(
      "/spaces/estate-grand-hall/listing",
    );
  });

  it("builds deep links for room and object context panels", () => {
    expect(buildRoomRoute("estate-grand-hall", "room-library")).toBe(
      "/spaces/estate-grand-hall/rooms/room-library",
    );
    expect(buildObjectRoute("estate-grand-hall", "obj-writing-desk")).toBe(
      "/spaces/estate-grand-hall/objects/obj-writing-desk",
    );
  });

  it("falls back to explore for unsupported or missing modes", () => {
    expect(resolveImmersiveMode("story")).toBe("story");
    expect(resolveImmersiveMode("invalid-mode")).toBe("explore");
    expect(resolveImmersiveMode(undefined)).toBe("explore");
  });
});
