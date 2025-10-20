"use client"

import { createContext, type ReactNode } from "react"
import type { I18nContextValue } from "@/lib/i18n/translate"

export const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ value, children }: { value: I18nContextValue; children: ReactNode }) {
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
