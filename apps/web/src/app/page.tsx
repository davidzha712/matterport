import { getRuntimeProjects } from "@/lib/platform-service"
import { LandingContent } from "@/components/landing-content"

export default async function HomePage() {
  const projects = await getRuntimeProjects()

  return <LandingContent projects={projects} />
}
