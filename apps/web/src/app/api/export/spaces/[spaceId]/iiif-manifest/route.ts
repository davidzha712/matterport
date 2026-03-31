import { NextRequest, NextResponse } from "next/server"
import { buildIiifManifest, getExportSpace, isExportReady, isPublicationReady } from "@/lib/export-service"

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

  if (strict && !isPublicationReady(space)) {
    return NextResponse.json(
      { detail: "Publication export blocked until at least one object is Approved" },
      { status: 409 },
    )
  }

  return NextResponse.json(buildIiifManifest(space))
}
