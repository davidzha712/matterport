"use client"

import { useLocale } from "@/lib/i18n"

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale()

  return (
    <button
      className="locale-switcher"
      onClick={() => setLocale(locale === "de" ? "en" : "de")}
      title={locale === "de" ? "Switch to English" : "Auf Deutsch wechseln"}
      type="button"
    >
      {locale === "de" ? "EN" : "DE"}
    </button>
  )
}
