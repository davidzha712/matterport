import type { Metadata, Viewport } from "next"
import { Cormorant_Garamond, DM_Sans } from "next/font/google"
import { Providers } from "./providers"
import "./globals.css"

const display = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"]
})

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "700"]
})

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
      <body className={`${display.variable} ${sans.variable}`}>
        <a className="skip-link" href="#main-content">
          Zum Inhalt springen
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
