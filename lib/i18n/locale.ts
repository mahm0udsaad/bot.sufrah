import { cookies, headers } from "next/headers"
import { defaultLocale, isLocale, type Locale } from "./config"

function detectFromAcceptLanguage(): Locale {
  const header = headers().get("accept-language")
  if (!header) return defaultLocale

  const preferred = header
    .split(",")
    .map((part) => part.trim().split(";")[0])
    .find((lang) => {
      if (!lang) return false
      const base = lang.split("-")[0]
      if (isLocale(lang)) return true
      if (isLocale(base)) return true
      return false
    })

  if (!preferred) return defaultLocale

  if (isLocale(preferred)) return preferred

  const base = preferred.split("-")[0]
  if (isLocale(base)) return base

  return defaultLocale
}

export function readLocale(): Locale {
  const cookieStore = cookies()
  const localeCookie = cookieStore.get("locale")?.value

  if (isLocale(localeCookie)) {
    return localeCookie
  }

  return detectFromAcceptLanguage()
}
