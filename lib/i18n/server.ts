import { cache } from "react"
import { getDictionary } from "./dictionaries"
import { getDirection, type Locale } from "./config"
import { readLocale } from "./locale"
import { createTranslator, type I18nContextValue } from "./translate"

export const getLocale = cache((): Locale => {
  return readLocale()
})

export const getMessages = cache(async () => {
  const locale = getLocale()
  return getDictionary(locale)
})

export async function getI18nValue(): Promise<I18nContextValue> {
  const locale = getLocale()
  const messages = await getMessages()
  return {
    locale,
    dir: getDirection(locale),
    messages,
  }
}

export async function getTranslator(namespace?: string) {
  const messages = await getMessages()
  const baseTranslator = createTranslator(messages)

  if (!namespace) {
    return baseTranslator
  }

  return (key: string, options?: Parameters<typeof baseTranslator>[1]) => {
    const namespacedKey = `${namespace}.${key}`
    return baseTranslator(namespacedKey, options)
  }
}
