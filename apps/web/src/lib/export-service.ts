import "server-only"

import type { ObjectRecord, ProjectRecord, SpaceRecord } from "@/lib/platform-types"
import { getRuntimeProjects, getRuntimeSpace } from "@/lib/platform-service"
import { getWorkflowReadiness } from "@/lib/workflow-readiness"

function sanitizeCsvCell(value: unknown): string {
  const text = String(value ?? "")
  if (["=", "+", "-", "@"].includes(text.slice(0, 1))) {
    return `'${text}`
  }
  return text
}

function escapeCsvCell(value: unknown): string {
  const safe = sanitizeCsvCell(value).replace(/"/g, "\"\"")
  return /[",\n]/.test(safe) ? `"${safe}"` : safe
}

export function serializeCsv(rows: Array<Array<unknown>>): string {
  return rows.map((row) => row.map((value) => escapeCsvCell(value)).join(",")).join("\n")
}

export async function listExportProjects(): Promise<ProjectRecord[]> {
  return getRuntimeProjects()
}

export async function getExportSpace(spaceId: string): Promise<SpaceRecord | undefined> {
  return getRuntimeSpace(spaceId)
}

export function isExportReady(space: SpaceRecord): boolean {
  return getWorkflowReadiness(space).exportReady
}

export function isPublicationReady(space: SpaceRecord): boolean {
  return getWorkflowReadiness(space).publishReady
}

export function buildAllObjectsCsv(projects: ProjectRecord[]): string {
  return serializeCsv([
    ["Project", "Space", "ID", "Title", "Type", "Room", "Status", "Disposition", "AI Summary"],
    ...projects.flatMap((project) =>
      project.spaces.flatMap((space) =>
        space.objects.map((objectRecord) => [
          project.name,
          space.name,
          objectRecord.id,
          objectRecord.title,
          objectRecord.type,
          objectRecord.roomName,
          objectRecord.status,
          objectRecord.disposition,
          objectRecord.aiSummary,
        ]),
      ),
    ),
  ])
}

export function buildSpaceObjectsCsv(space: SpaceRecord): string {
  return serializeCsv([
    ["ID", "Title", "Type", "Room", "Status", "Disposition", "AI Summary"],
    ...space.objects.map((objectRecord) => [
      objectRecord.id,
      objectRecord.title,
      objectRecord.type,
      objectRecord.roomName,
      objectRecord.status,
      objectRecord.disposition,
      objectRecord.aiSummary,
    ]),
  ])
}

export function buildIiifManifest(space: SpaceRecord) {
  const baseId = `https://matterport.local/iiif/spaces/${space.id}`

  return {
    "@context": "http://iiif.io/api/presentation/3/context.json",
    id: `${baseId}/manifest`,
    items: space.objects.map((objectRecord) => {
      const canvasId = `${baseId}/canvas/${objectRecord.id}`

      return {
        id: canvasId,
        items: [
          {
            id: `${canvasId}/page`,
            items: [
              {
                body: {
                  format: "text/plain",
                  label: { en: [objectRecord.title] },
                  type: "TextualBody",
                  value: objectRecord.aiSummary || objectRecord.title,
                },
                id: `${baseId}/annotation/${objectRecord.id}`,
                motivation: "commenting",
                target: canvasId,
                type: "Annotation",
              },
            ],
            type: "AnnotationPage",
          },
        ],
        label: { en: [objectRecord.title] },
        metadata: [
          { label: { en: ["Room"] }, value: { en: [objectRecord.roomName] } },
          { label: { en: ["Status"] }, value: { en: [objectRecord.status] } },
          { label: { en: ["Disposition"] }, value: { en: [objectRecord.disposition] } },
        ],
        summary: { en: [objectRecord.aiSummary || objectRecord.type] },
        type: "Canvas",
        width: 1600,
        height: 1000,
      }
    }),
    label: { en: [space.name] },
    requiredStatement: {
      label: { en: ["Workflow Gate"] },
      value: { en: ["Human review remains required before publication and external distribution."] },
    },
    summary: { en: [space.summary] },
    type: "Manifest",
  }
}

export function cloneSpace(space: SpaceRecord, objectOverride?: ObjectRecord[]): SpaceRecord {
  return {
    ...space,
    objects: objectOverride ?? space.objects,
  }
}
