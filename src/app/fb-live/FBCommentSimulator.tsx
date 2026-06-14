"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { simulateFBComment } from "@/lib/actions";

export default function FBCommentSimulator({ keywords }: { keywords: string[] }) {
  const [comment, setComment] = useState("");
  const [customer, setCustomer] = useState("");
  const [result, setResult] = useState<{ text: string; ok: boolean } | null>(null);
  const router = useRouter();

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    const fd = new FormData();
    fd.set("comment", comment);
    fd.set("customer", customer || "Test User");
    const res = await simulateFBComment(fd);
    if (res.success) {
      setResult({ text: `✅ ${res.product} x${res.qty} via #${res.matched}${res.reply ? ` — Auto-reply: "${res.reply}"` : ""}`, ok: true });
    } else if (res.matched === false) {
      setResult({ text: "No keyword found in comment", ok: false });
    } else {
      setResult({ text: res.error || "Failed", ok: false });
    }
    setComment("");
    router.refresh();
    setTimeout(() => setResult(null), 5000);
  };

  return (
    <form onSubmit={handleSimulate} className="space-y-3">
      <div>
        <label className="input-label">Customer Name</label>
        <input
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          placeholder="Test User"
          className="input-field"
        />
      </div>
      <div>
        <label className="input-label">Comment Text</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="e.g. I want #product1 please!"
          className="input-field resize-none"
          rows={2}
          required
        />
      </div>
      <button
        type="submit"
        className="w-full py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-sky-600 to-blue-600 text-white hover:from-sky-500 hover:to-blue-500 transition-all duration-200 shadow-lg shadow-sky-500/15 border border-sky-500/20 flex items-center justify-center gap-2 cursor-pointer"
      >
        <Send className="size-4" />
        Simulate Comment
      </button>
      {result && (
        <div className={`text-xs text-center py-2 rounded-lg ${result.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
          {result.text}
        </div>
      )}
      {keywords.length > 0 && (
        <div className="text-xs text-faint">
          Active keywords: {keywords.map((k) => <code key={k} className="text-violet-400 mx-0.5">#{k}</code>)}
        </div>
      )}
    </form>
  );
}
