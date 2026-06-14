"use client";

import { useTranslation } from "@/i18n/useTranslation";
import { Languages } from "lucide-react";

export default function LocaleSwitcher() {
  const { locale, setLocale } = useTranslation();

  return (
    <button
      onClick={() => setLocale(locale === "en" ? "kh" : "en")}
      className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer hover:bg-white/5"
      style={{ color: "var(--text-secondary)" }}
      title={locale === "en" ? "Switch to ភាសាខ្មែរ" : "Switch to English"}
    >
      <Languages className="size-4" />
      <span>{locale === "en" ? "ភាសាខ្មែរ" : "English"}</span>
    </button>
  );
}
