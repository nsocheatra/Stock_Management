"use client";

import { Trash2 } from "lucide-react";
import { clearAllAudits } from "@/server/actions";
import { useTranslation } from "@/i18n/useTranslation";

export default function ClearAuditsButton() {
  const { t } = useTranslation();
  const handleClick = async () => {
    if (!confirm("Clear all stock count data? This cannot be undone.")) return;
    await clearAllAudits();
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 bg-rose-600/20 text-rose-400 px-4.5 py-2.5 rounded-xl hover:bg-rose-600/30 active:scale-95 transition-all duration-200 border border-rose-500/20 text-sm font-semibold cursor-pointer"
    >
      <Trash2 className="size-4" />
      {t("audit.clearAll")}
    </button>
  );
}
