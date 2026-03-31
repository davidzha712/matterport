"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react"
import { translations } from "./translations"

export type Locale = "de" | "en"

type TranslationMap = typeof translations.de

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: TranslationMap
}

const I18nContext = createContext<I18nContextValue | null>(null)
const LOCALE_CHANGE_EVENT = "matterport-locale-change"

function isLocale(value: string | null): value is Locale {
  return value === "de" || value === "en"
}

function readStoredLocale(defaultLocale: Locale): Locale {
  if (typeof window === "undefined") {
    return defaultLocale
  }

  const stored =
    typeof window.localStorage?.getItem === "function"
      ? window.localStorage.getItem("locale")
      : null
  return isLocale(stored) ? stored : defaultLocale
}

function subscribeLocale(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {}
  }

  const notify = () => onStoreChange()
  window.addEventListener("storage", notify)
  window.addEventListener(LOCALE_CHANGE_EVENT, notify)

  return () => {
    window.removeEventListener("storage", notify)
    window.removeEventListener(LOCALE_CHANGE_EVENT, notify)
  }
}

export function LocaleProvider({ children, defaultLocale = "de" }: { children: ReactNode; defaultLocale?: Locale }) {
  const locale = useSyncExternalStore(
    subscribeLocale,
    () => readStoredLocale(defaultLocale),
    () => defaultLocale
  )

  const setLocale = useCallback((next: Locale) => {
    if (typeof window !== "undefined") {
      if (typeof window.localStorage?.setItem === "function") {
        window.localStorage.setItem("locale", next)
      }
      document.documentElement.lang = next
      window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT))
    }
  }, [])

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale
    }
  }, [locale])

  const t = useMemo(() => translations[locale], [locale])

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useLocale() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider")
  return ctx
}

export function useT() {
  return useLocale().t
}
