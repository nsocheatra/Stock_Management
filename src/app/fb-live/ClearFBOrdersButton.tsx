"use client";

import { Trash2 } from "lucide-react";
import { clearFBOrders } from "@/lib/actions";

export default function ClearFBOrdersButton() {
  const handleClick = async () => {
    if (!confirm("Clear all FB orders? This cannot be undone.")) return;
    await clearFBOrders();
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-600/20 text-rose-400 border border-rose-500/20 hover:bg-rose-600/30 active:scale-95 transition-all duration-200 cursor-pointer whitespace-nowrap"
    >
      <Trash2 className="size-3" />
      Clear
    </button>
  );
}
