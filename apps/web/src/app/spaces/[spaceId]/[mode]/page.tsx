import { notFound } from "next/navigation"
import { ImmersiveShell } from "@/components/immersive-shell"
import { getRuntimeSpace } from "@/lib/platform-service"
import { getRuntimeProviderProfiles } from "@/lib/provider-service"
import { isStageMode, type StageMode } from "@/lib/routes"

type SpaceModePageProps = {
  params: Promise<{
    mode: string
    spaceId: string
  }>
}

export const dynamic = "force-dynamic"

export default async function SpaceModePage({ params }: SpaceModePageProps) {
  const { mode, spaceId } = await params

  if (!isStageMode(mode)) {
    notFound()
  }

  const [space, providers] = await Promise.all([
    getRuntimeSpace(spaceId),
    getRuntimeProviderProfiles()
  ])

  if (!space) {
    notFound()
  }

  return <ImmersiveShell focusMode={mode as StageMode} providers={providers} space={space} />
}
