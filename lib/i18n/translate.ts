import type { Locale } from "./config"

export type Messages = Record<string, unknown>

export type TranslateOptions = {
  values?: Record<string, string | number>
}

export type Translator = (key: string, options?: TranslateOptions) => string

export function createTranslator(messages: Messages): Translator {
  return (key, options) => {
    const raw = resolveKey(messages, key)

    if (typeof raw !== "string") {
      // Return the key so missing translations are easy to spot during development
      return key
    }

    if (!options?.values) {
      return raw
    }

    return raw.replace(/\{(\w+)\}/g, (_, match: string) => {
      const replacement = options.values?.[match]
      return replacement !== undefined ? String(replacement) : `{${match}}`
    })
  }
}

export function resolveKey(messages: Messages, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === "object" && segment in acc) {
      return (acc as Record<string, unknown>)[segment]
    }
    return undefined
  }, messages)
}

export interface I18nContextValue {
  locale: Locale
  dir: "ltr" | "rtl"
  messages: Messages
}
