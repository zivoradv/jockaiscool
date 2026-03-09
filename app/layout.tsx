import CatOverlay from "@/components/CatOverlay"
import "./globals.css"
import type { Metadata } from "next"
import CuteExtras from "@/components/CuteExtras"

export const metadata: Metadata = {
  title: "COOL GAMING",
  description: "3 games for 2 players — Word Race, Wordle, Card Battle",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <CatOverlay />
        <CuteExtras />
      </body>
    </html>
  )
}
