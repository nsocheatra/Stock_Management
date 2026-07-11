"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteUser } from "@/server/auth";
import { useTranslation } from "@/i18n/useTranslation";

export default function DeleteButton({ userId }: { userId: number }) {
  const { t } = useTranslation();
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    const result = await deleteUser(userId);
    if (result.success) router.refresh();
    setConfirm(false);
  };

  if (confirm) {
    return (
      <div className="flex items-center gap-1">
        <button onClick={handleDelete} className="px-2 py-1 rounded-lg text-[10px] font-medium bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors cursor-pointer">{t("common.confirm")}</button>
        <button onClick={() => setConfirm(false)} className="px-2 py-1 rounded-lg text-[10px] font-medium bg-surface text-muted hover:text-default transition-colors cursor-pointer">{t("common.cancel")}</button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirm(true)} className="p-2 rounded-lg text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer">
      <Trash2 className="size-4" />
    </button>
  );
}
