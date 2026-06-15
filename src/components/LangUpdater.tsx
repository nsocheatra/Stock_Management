"use client";

import { useEffect } from "react";
import { useTranslation } from "@/i18n/useTranslation";

export function LangUpdater() {
  const { locale } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
