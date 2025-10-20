"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config"

export async function setLocale(locale: Locale, redirectTo: string) {
  const nextLocale = isLocale(locale) ? locale : defaultLocale
  const targetPath = typeof redirectTo === "string" && redirectTo.startsWith("/") ? redirectTo : "/"

  const cookieStore = cookies()
  cookieStore.set({
    name: "locale",
    value: nextLocale,
    path: "/",
  })

  redirect(targetPath)
}
