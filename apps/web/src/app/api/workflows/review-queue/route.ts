import { NextRequest, NextResponse } from "next/server"
import { getRuntimeReviewQueue } from "@/lib/platform-service"

export async function GET(request: NextRequest) {
  const spaceId = request.nextUrl.searchParams.get("spaceId")
  const items = await getRuntimeReviewQueue()

  return NextResponse.json({
    items: spaceId ? items.filter((item) => item.spaceId === spaceId) : items,
  })
}
