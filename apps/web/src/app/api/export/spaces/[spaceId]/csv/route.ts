import { NextRequest, NextResponse } from "next/server"
import { buildSpaceObjectsCsv, getExportSpace, isExportReady } from "@/lib/export-service"

type RouteContext = {
  params: Promise<{ spaceId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { spaceId } = await context.params
  const strict = request.nextUrl.searchParams.get("strict") === "true"
  const space = await getExportSpace(spaceId)

  if (!space) {
    return NextResponse.json({ detail: "Space not found" }, { status: 404 })
  }

  if (strict && !isExportReady(space)) {
    return NextResponse.json(
      { detail: "Space export blocked until all objects leave Needs Review" },
      { status: 409 },
    )
  }

  return new Response(buildSpaceObjectsCsv(space), {
    headers: {
      "Content-Disposition": `attachment; filename=space_${spaceId}_objects.csv`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  })
}
