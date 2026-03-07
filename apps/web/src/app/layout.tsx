import type { Metadata, Viewport } from "next"
import { Providers } from "./providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "Immersive Wissensraeume",
  description:
    "Eine wiederverwendbare Multi-Projekt-Plattform fuer Matterport, Museumsinszenierung und KI-gestuetzte Workflows."
}

export const viewport: Viewport = {
  themeColor: "#08111a"
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de">
      <body>
        <a className="skip-link" href="#main-content">
          Zum Inhalt springen
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
