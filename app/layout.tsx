import type React from "react"
import type { Metadata } from "next"
import { Cairo, Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth"
import { I18nProvider } from "@/contexts/i18n-context"
import { getI18nValue } from "@/lib/i18n/server"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
})

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
})

export const metadata: Metadata = {
  title: "Sufrah Bot Dashboard",
  description: "WhatsApp ordering bot management dashboard",
  generator: "v0.app",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const i18n = await getI18nValue()

  return (
    <html
      lang={i18n.locale}
      dir={i18n.dir}
      className={`${inter.variable} ${jetbrainsMono.variable} ${cairo.variable} antialiased`}
    >
      <head>
        <link rel="icon" href="/Gemini_Generated_Image_ipzpxqipzpxqipzp.ico" type="image/x-icon" />
      </head>
      <body>
        <I18nProvider value={i18n}>
          <AuthProvider>{children}</AuthProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
