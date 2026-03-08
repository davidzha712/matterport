"use client"

import { useCallback } from "react"
import type { MatterportBridge } from "./matterport-bridge"
import type { SpaceRecord } from "./platform-types"

type CommandResult = {
  handled: boolean
  feedback: string
}

/**
 * Parses voice transcript and executes spatial commands on the bridge.
 * Returns true if the transcript was a command (vs free-text for AI).
 *
 * Supported commands (EN + DE + ZH):
 * - Navigation: "go to kitchen" / "gehe zur Küche" / "去厨房"
 * - Tour: "start tour" / "Führung starten" / "开始游览"
 * - Screenshot: "take photo" / "Foto machen" / "拍照"
 * - View mode: "dollhouse view" / "Puppenhaus" / "鸟瞰"
 * - Next/prev room: "next room" / "nächster Raum" / "下一个房间"
 */
export function useVoiceCommands(
  bridge: MatterportBridge,
  space: SpaceRecord
) {
  const executeCommand = useCallback(
    async (transcript: string): Promise<CommandResult> => {
      const text = transcript.toLowerCase().trim()

      // --- Navigation: go to room ---
      const roomMatch = matchRoomCommand(text, space)
      if (roomMatch) {
        const success = await bridge.navigateToRoom(roomMatch.id)
        return {
          handled: true,
          feedback: success
            ? `Navigating to ${roomMatch.name}`
            : `Room "${roomMatch.name}" not found in 3D model`,
        }
      }

      // --- Tour controls ---
      if (matchesAny(text, [
        "start tour", "begin tour", "auto tour",
        "führung starten", "tour starten",
        "开始游览", "开始导览", "自动游览",
      ])) {
        await bridge.startTour()
        return { handled: true, feedback: "Tour started" }
      }

      if (matchesAny(text, [
        "stop tour", "end tour", "pause tour",
        "führung stoppen", "tour stoppen", "tour beenden",
        "停止游览", "结束游览",
      ])) {
        await bridge.stopTour()
        return { handled: true, feedback: "Tour stopped" }
      }

      if (matchesAny(text, [
        "next", "next room", "next stop",
        "nächster", "nächster raum", "weiter",
        "下一个", "下一个房间",
      ])) {
        if (bridge.isTourActive) {
          await bridge.nextTourStep()
          return { handled: true, feedback: "Next tour stop" }
        }
        const moved = await bridge.navigateInDirection("forward")
        return { handled: true, feedback: moved ? "Moving forward" : "No path forward" }
      }

      if (matchesAny(text, [
        "previous", "prev room", "back",
        "zurück", "vorheriger raum",
        "上一个", "上一个房间", "返回",
      ])) {
        if (bridge.isTourActive) {
          await bridge.prevTourStep()
          return { handled: true, feedback: "Previous tour stop" }
        }
        const moved = await bridge.navigateInDirection("backward")
        return { handled: true, feedback: moved ? "Moving backward" : "No path backward" }
      }

      // --- Screenshot ---
      if (matchesAny(text, [
        "take photo", "screenshot", "capture", "take a photo", "take picture",
        "foto", "foto machen", "aufnehmen", "screenshot machen",
        "拍照", "截图", "拍一张",
      ])) {
        const dataUrl = await bridge.captureScreenshot()
        if (dataUrl) {
          window.dispatchEvent(
            new CustomEvent("matterport-screenshot", { detail: { dataUrl } })
          )
          return { handled: true, feedback: "Screenshot captured" }
        }
        return { handled: true, feedback: "Screenshot failed" }
      }

      // --- View mode ---
      if (matchesAny(text, [
        "dollhouse", "bird's eye", "birds eye", "overview",
        "puppenhaus", "vogelperspektive", "übersicht",
        "鸟瞰", "俯视", "全景",
      ])) {
        await bridge.setViewMode("dollhouse")
        return { handled: true, feedback: "Dollhouse view" }
      }

      if (matchesAny(text, [
        "floor plan", "floorplan", "top down", "map",
        "grundriss",
        "平面图", "地图",
      ])) {
        await bridge.setViewMode("floorplan")
        return { handled: true, feedback: "Floor plan view" }
      }

      if (matchesAny(text, [
        "inside", "first person", "walk", "walkthrough",
        "innenansicht", "begehung",
        "室内", "第一人称", "走进去",
      ])) {
        await bridge.setViewMode("inside")
        return { handled: true, feedback: "Inside view" }
      }

      // Not a command — let it pass through to AI
      return { handled: false, feedback: "" }
    },
    [bridge, space]
  )

  return { executeCommand }
}

function matchesAny(text: string, patterns: string[]): boolean {
  return patterns.some((p) => text.includes(p))
}

function matchRoomCommand(
  text: string,
  space: SpaceRecord
): { id: string; name: string } | null {
  // Match patterns like "go to X", "gehe zu X", "去X"
  const prefixes = [
    /^(?:go to|navigate to|take me to|move to)\s+/,
    /^(?:gehe zu|geh zum|geh zur|gehe zur|navigiere zu|navigiere zum)\s+/,
    /^(?:去|到|前往|走到)\s*/,
  ]

  let roomName: string | null = null

  for (const prefix of prefixes) {
    const match = text.match(prefix)
    if (match) {
      roomName = text.slice(match[0].length).trim()
      break
    }
  }

  if (!roomName) return null

  // Fuzzy match against space rooms
  const normalized = roomName.toLowerCase()
  const exactMatch = space.rooms.find(
    (r) => r.name.toLowerCase() === normalized
  )
  if (exactMatch) return { id: exactMatch.id, name: exactMatch.name }

  // Partial match (room name contains spoken text or vice versa)
  const partialMatch = space.rooms.find(
    (r) =>
      r.name.toLowerCase().includes(normalized) ||
      normalized.includes(r.name.toLowerCase())
  )
  if (partialMatch) return { id: partialMatch.id, name: partialMatch.name }

  return null
}
