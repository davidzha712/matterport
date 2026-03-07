import type { Metadata } from "next"
import { Fraunces, Manrope } from "next/font/google"
import { Providers } from "./providers"
import "./globals.css"

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display"
})

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans"
})

export const metadata: Metadata = {
  title: "Immersive Knowledge Spaces",
  description:
    "A reusable multi-project Matterport platform for estate review, museum-style interpretation, and workflow orchestration."
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable}`}>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

