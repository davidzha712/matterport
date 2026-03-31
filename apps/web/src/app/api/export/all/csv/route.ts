import { NextRequest, NextResponse } from "next/server"
import { buildAllObjectsCsv, isExportReady, listExportProjects } from "@/lib/export-service"

export async function GET(request: NextRequest) {
  const strict = request.nextUrl.searchParams.get("strict") === "true"
  const projects = await listExportProjects()

  if (strict) {
    const blockedSpaces = projects.flatMap((project) =>
      project.spaces.filter((space) => !isExportReady(space)).map((space) => space.name),
    )

    if (blockedSpaces.length > 0) {
      return NextResponse.json(
        { detail: "Global export blocked until every space is export-ready" },
        { status: 409 },
      )
    }
  }

  return new Response(buildAllObjectsCsv(projects), {
    headers: {
      "Content-Disposition": "attachment; filename=all_objects_export.csv",
      "Content-Type": "text/csv; charset=utf-8",
    },
  })
}
