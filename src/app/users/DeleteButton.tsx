"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteUser } from "@/lib/auth";

export default function DeleteButton({ userId }: { userId: number }) {
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
        <button onClick={handleDelete} className="px-2 py-1 rounded-lg text-[10px] font-medium bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors cursor-pointer">Confirm</button>
        <button onClick={() => setConfirm(false)} className="px-2 py-1 rounded-lg text-[10px] font-medium bg-surface text-muted hover:text-default transition-colors cursor-pointer">Cancel</button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirm(true)} className="p-2 rounded-lg text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer">
      <Trash2 className="size-4" />
    </button>
  );
}
