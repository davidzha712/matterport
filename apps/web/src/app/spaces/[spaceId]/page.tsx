import { redirect } from "next/navigation"
import { buildSpaceRoute } from "@/lib/routes"

type SpaceIndexPageProps = {
  params: Promise<{
    spaceId: string
  }>
}

export default async function SpaceIndexPage({ params }: SpaceIndexPageProps) {
  const { spaceId } = await params

  redirect(buildSpaceRoute(spaceId))
}

