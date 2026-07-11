"use client";

import { createContext, useState, useCallback, type ReactNode } from "react";
import en from "./en.json";
import kh from "./kh.json";

type Locale = "en" | "kh";

type Messages = Record<string, unknown>;
const messages: Record<Locale, Messages> = { en, kh };

function resolveKey(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

export interface I18nContextValue {
  t: (key: string, vars?: Record<string, string | number>) => string;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const I18nContext = createContext<I18nContextValue>({
  t: (key: string) => key,
  locale: "en",
  setLocale: () => {},
});

export function I18nProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? "en");

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem("locale", l); } catch {}
    try { document.cookie = `locale=${l};path=/;max-age=31536000;SameSite=Lax`; } catch {}
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const fallback = key.split(".").pop() ?? key;
      const value = resolveKey(messages[locale], key);
      const template = typeof value === "string" ? value : fallback;
      return vars ? interpolate(template, vars) : template;
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ t, locale, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}
