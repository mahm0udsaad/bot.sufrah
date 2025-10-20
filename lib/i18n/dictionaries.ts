import type { Locale } from "./config"

const dictionaries = {
  en: () => import("@/locales/en").then((module) => module.default),
  ar: () => import("@/locales/ar").then((module) => module.default),
} satisfies Record<Locale, () => Promise<Record<string, unknown>>>

export async function getDictionary(locale: Locale) {
  const loadDictionary = dictionaries[locale]
  return loadDictionary()
}
