"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { translations } from "./translations"

export type Locale = "de" | "en"

type TranslationMap = typeof translations.de

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: TranslationMap
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function LocaleProvider({ children, defaultLocale = "de" }: { children: ReactNode; defaultLocale?: Locale }) {
  // Always start with defaultLocale to avoid hydration mismatch
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)

  // Restore saved locale after mount (client-only)
  useEffect(() => {
    const stored = localStorage.getItem("locale")
    if ((stored === "de" || stored === "en") && stored !== defaultLocale) {
      setLocaleState(stored)
    }
  }, [defaultLocale])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    if (typeof window !== "undefined") {
      localStorage.setItem("locale", next)
      document.documentElement.lang = next
    }
  }, [])

  const t = useMemo(() => translations[locale], [locale])

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <I18nContext value={value}>{children}</I18nContext>
}

export function useLocale() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider")
  return ctx
}

export function useT() {
  return useLocale().t
}
