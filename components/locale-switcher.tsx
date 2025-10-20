"use client"

import { useTransition } from "react"
import { usePathname } from "next/navigation"
import { setLocale } from "@/app/actions/set-locale"
import { locales, type Locale } from "@/lib/i18n/config"
import { useI18n } from "@/hooks/use-i18n"
import { Button } from "@/components/ui/button"

export function LocaleSwitcher() {
  const { locale, t } = useI18n()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const nextLocale: Locale = locale === "en" ? "ar" : "en"

  const currentLabel = locale === "en" ? t("common.languageSwitcher.english") : t("common.languageSwitcher.arabic")
  const targetLabel = locale === "en" ? t("common.languageSwitcher.arabic") : t("common.languageSwitcher.english")

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={`${t("common.languageSwitcher.toggleLabel")}: ${targetLabel}`}
      disabled={isPending}
      onClick={() => {
        startTransition(() => setLocale(nextLocale, pathname ?? "/"))
      }}
      title={`${currentLabel} → ${targetLabel}`}
    >
      <span className="text-sm font-medium">
        {locale === "en" ? "ع" : "En"}
      </span>
    </Button>
  )
}
