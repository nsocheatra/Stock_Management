"use client";

import { useTranslation } from "@/i18n/useTranslation";

export function T({ k, vars }: { k: string; vars?: Record<string, string | number> }) {
  const { t } = useTranslation();
  return <>{t(k, vars)}</>;
}
