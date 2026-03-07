import { notFound } from "next/navigation"
import { ImmersiveShell } from "@/components/immersive-shell"
import { getRoomById, getSpaceById } from "@/lib/mock-data"

type RoomDetailPageProps = {
  params: Promise<{
    roomId: string
    spaceId: string
  }>
}

export default async function RoomDetailPage({ params }: RoomDetailPageProps) {
  const { roomId, spaceId } = await params
  const room = getRoomById(spaceId, roomId)
  const space = getSpaceById(spaceId)

  if (!space || !room) {
    notFound()
  }

  return <ImmersiveShell focusMode="explore" selectedRoom={room} space={space} />
}

