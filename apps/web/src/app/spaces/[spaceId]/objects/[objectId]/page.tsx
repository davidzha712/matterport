import { notFound } from "next/navigation"
import { ImmersiveShell } from "@/components/immersive-shell"
import { getObjectById, getSpaceById } from "@/lib/mock-data"

type ObjectDetailPageProps = {
  params: Promise<{
    objectId: string
    spaceId: string
  }>
}

export default async function ObjectDetailPage({ params }: ObjectDetailPageProps) {
  const { objectId, spaceId } = await params
  const space = getSpaceById(spaceId)
  const objectRecord = getObjectById(spaceId, objectId)

  if (!space || !objectRecord) {
    notFound()
  }

  return <ImmersiveShell focusMode="explore" selectedObject={objectRecord} space={space} />
}

