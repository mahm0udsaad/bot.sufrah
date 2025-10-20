export const locales = ["en", "ar"] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "en"

export const rtlLocales: Locale[] = ["ar"]

export function isLocale(input: string | undefined | null): input is Locale {
  if (!input) return false
  return (locales as readonly string[]).includes(input)
}

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return rtlLocales.includes(locale) ? "rtl" : "ltr"
}
