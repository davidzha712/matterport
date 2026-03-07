import { notFound } from "next/navigation"
import { ImmersiveShell } from "@/components/immersive-shell"
import { getSpaceById } from "@/lib/mock-data"
import { isStageMode, type StageMode } from "@/lib/routes"

type SpaceModePageProps = {
  params: Promise<{
    mode: string
    spaceId: string
  }>
}

export default async function SpaceModePage({ params }: SpaceModePageProps) {
  const { mode, spaceId } = await params

  if (!isStageMode(mode)) {
    notFound()
  }

  const space = getSpaceById(spaceId)

  if (!space) {
    notFound()
  }

  return <ImmersiveShell focusMode={mode as StageMode} space={space} />
}

export function generateStaticParams() {
  return []
}

