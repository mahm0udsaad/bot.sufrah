"use client"

import { useContext, useMemo } from "react"
import { I18nContext } from "@/contexts/i18n-context"
import { createTranslator } from "@/lib/i18n/translate"

export function useI18n() {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error("useI18n must be used inside an I18nProvider")
  }

  const translator = useMemo(() => createTranslator(context.messages), [context.messages])

  return {
    locale: context.locale,
    dir: context.dir,
    t: translator,
    messages: context.messages,
  }
}
