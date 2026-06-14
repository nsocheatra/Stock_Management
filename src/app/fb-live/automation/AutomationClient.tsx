"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, ToggleLeft, ToggleRight, TestTube,
  MessageSquare, Edit3, X, Check, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  addMessengerRule, updateMessengerRule, deleteMessengerRule,
  toggleMessengerRule, testMessengerRule,
  addQuickReply, deleteQuickReply,
} from "@/lib/actions";

interface Rule {
  id: number; keyword: string; response: string; match_mode: string; category: string;
  enabled: number; times_triggered: number; created_at: string;
}

interface QuickReply {
  id: number; title: string; text: string; payload: string;
}

const categories = ["general", "greeting", "support", "sales"];
const categoryColors: Record<string, string> = {
  general: "bg-zinc-500/20 text-zinc-300",
  greeting: "bg-emerald-500/20 text-emerald-300",
  support: "bg-blue-500/20 text-blue-300",
  sales: "bg-amber-500/20 text-amber-300",
};

export default function AutomationClient({ rules, quickReplies }: { rules: Rule[]; quickReplies: QuickReply[] }) {
  const [keyword, setKeyword] = useState("");
  const [response, setResponse] = useState("");
  const [matchMode, setMatchMode] = useState("contains");
  const [category, setCategory] = useState("general");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editKeyword, setEditKeyword] = useState("");
  const [editResponse, setEditResponse] = useState("");
  const [editMatchMode, setEditMatchMode] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [testText, setTestText] = useState("");
  const [testResult, setTestResult] = useState<{ matched: string | null; response: string | null } | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [qrTitle, setQrTitle] = useState("");
  const [qrText, setQrText] = useState("");
  const router = useRouter();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || !response.trim()) return;
    const fd = new FormData();
    fd.set("keyword", keyword.trim().toLowerCase());
    fd.set("response", response.trim());
    fd.set("match_mode", matchMode);
    fd.set("category", category);
    await addMessengerRule(fd);
    setKeyword(""); setResponse(""); setCategory("general");
    router.refresh();
  };

  const startEdit = (rule: Rule) => {
    setEditingId(rule.id);
    setEditKeyword(rule.keyword);
    setEditResponse(rule.response);
    setEditMatchMode(rule.match_mode);
    setEditCategory(rule.category);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const fd = new FormData();
    fd.set("id", String(editingId));
    fd.set("keyword", editKeyword.trim().toLowerCase());
    fd.set("response", editResponse.trim());
    fd.set("match_mode", editMatchMode);
    fd.set("category", editCategory);
    await updateMessengerRule(fd);
    setEditingId(null);
    router.refresh();
  };

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testText.trim()) return;
    const fd = new FormData();
    fd.set("test_text", testText);
    const res = await testMessengerRule(fd) as { success: boolean; matched: string | null; response: string | null };
    setTestResult({ matched: res.matched, response: res.response });
  };

  const addQR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrTitle.trim() || !qrText.trim()) return;
    const fd = new FormData();
    fd.set("title", qrTitle.trim());
    fd.set("text", qrText.trim());
    await addQuickReply(fd);
    setQrTitle(""); setQrText("");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Rule Builder + Rules List */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Add Rule Form */}
        <div className="lg:col-span-2 bg-surface-blur border-surface rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-semibold text-default flex items-center gap-2">
            <Plus className="size-4 text-muted" />
            New Auto-Reply Rule
          </h3>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Trigger Keyword</label>
                <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. hello" className="input-field" required />
              </div>
              <div>
                <label className="input-label">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
                  {categories.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="input-label">Bot Response</label>
              <textarea value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Hi! Welcome to our store." rows={3} className="input-field resize-none" required />
            </div>
            <div>
              <label className="input-label">Match Mode</label>
              <select value={matchMode} onChange={(e) => setMatchMode(e.target.value)} className="input-field">
                <option value="contains">Contains — matches if keyword appears anywhere</option>
                <option value="exact">Exact Match — must be exactly the keyword</option>
                <option value="starts">Starts With — message starts with keyword</option>
              </select>
            </div>
            <button type="submit" className="w-full py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/15 border border-violet-500/20 cursor-pointer">
              <Plus className="size-4 inline mr-1" />
              Add Rule
            </button>
          </form>
        </div>

        {/* Rules List */}
        <div className="lg:col-span-3 bg-surface-blur border-surface rounded-2xl p-5 shadow-xl space-y-3">
          <h3 className="text-sm font-semibold text-default flex items-center justify-between">
            <span>Custom Rules ({rules.length})</span>
            <div className="flex gap-1">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    const el = document.getElementById(`cat-${c}`);
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded-full border border-surface ${categoryColors[c]} cursor-pointer`}
                >
                  {c}
                </button>
              ))}
            </div>
          </h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {rules.length > 0 ? (
              rules.map((rule) => (
                <div key={rule.id} id={`cat-${rule.category}`} className="p-3 rounded-xl border border-surface hover-surface transition-colors">
                  {editingId === rule.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input value={editKeyword} onChange={(e) => setEditKeyword(e.target.value)} className="input-field text-xs" />
                        <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="input-field text-xs">
                          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <textarea value={editResponse} onChange={(e) => setEditResponse(e.target.value)} rows={2} className="input-field resize-none text-xs" />
                      <select value={editMatchMode} onChange={(e) => setEditMatchMode(e.target.value)} className="input-field text-xs">
                        <option value="contains">Contains</option><option value="exact">Exact</option><option value="starts">Starts With</option>
                      </select>
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors flex items-center gap-1 cursor-pointer">
                          <Check className="size-3" /> Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface text-muted hover:text-default transition-colors flex items-center gap-1 cursor-pointer">
                          <X className="size-3" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-xs font-mono text-violet-300 bg-violet-500/10 px-1.5 py-0.5 rounded">{rule.keyword}</code>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${categoryColors[rule.category] || "bg-zinc-500/20 text-zinc-300"}`}>
                            {rule.category}
                          </span>
                          <span className="text-[10px] text-faint uppercase">{rule.match_mode}</span>
                          {rule.times_triggered > 0 && (
                            <span className="text-[10px] text-emerald-400/70">{rule.times_triggered}x triggered</span>
                          )}
                        </div>
                        <p className="text-xs text-muted mt-1.5 line-clamp-2">{rule.response}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => startEdit(rule)} className="p-1.5 rounded-lg text-muted hover:text-violet-400 hover:bg-violet-500/10 transition-colors cursor-pointer">
                          <Edit3 className="size-3.5" />
                        </button>
                        <button onClick={async () => { await toggleMessengerRule(rule.id); router.refresh(); }} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${rule.enabled ? "text-emerald-400 hover:bg-emerald-500/10" : "text-muted hover:bg-surface"}`}>
                          {rule.enabled ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
                        </button>
                        <button onClick={async () => { await deleteMessengerRule(rule.id); router.refresh(); }} className="p-1.5 rounded-lg text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-faint">
                <MessageSquare className="size-6 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No custom rules yet</p>
                <p className="text-xs mt-1">Add rules to automate responses in Messenger</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rule Tester & Quick Replies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rule Tester */}
        <div className="bg-surface-blur border-surface rounded-2xl p-5 shadow-xl space-y-3">
          <h3 className="text-sm font-semibold text-default flex items-center gap-2">
            <TestTube className="size-4 text-muted" />
            Test Rules
          </h3>
          <form onSubmit={handleTest} className="space-y-3">
            <input value={testText} onChange={(e) => setTestText(e.target.value)} placeholder="Type a test message..." className="input-field" />
            <button type="submit" className="w-full py-2 rounded-xl text-sm font-medium border border-surface text-muted hover:text-default hover:bg-surface transition-all cursor-pointer">
              Simulate Message
            </button>
          </form>
          {testResult && (
            <div className={`rounded-xl p-3 text-xs border ${testResult.matched ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20"}`}>
              {testResult.matched ? (
                <>
                  <p className="text-emerald-400 font-semibold mb-1">✅ Matched: #{testResult.matched}</p>
                  <p className="text-muted">{testResult.response}</p>
                </>
              ) : (
                <p className="text-amber-300">No rule matched. The AI fallback or built-in commands will handle this.</p>
              )}
            </div>
          )}
        </div>

        {/* Quick Replies */}
        <div className="bg-surface-blur border-surface rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-default flex items-center gap-2">
              <MessageSquare className="size-4 text-muted" />
              Quick Replies
            </h3>
            <button onClick={() => setShowQR(!showQR)} className="text-xs text-violet-400 hover:text-violet-300 transition-colors cursor-pointer">
              {showQR ? "Cancel" : "+ Add"}
            </button>
          </div>
          {showQR && (
            <form onSubmit={addQR} className="space-y-2 p-3 rounded-xl bg-black/20 border border-surface">
              <input value={qrTitle} onChange={(e) => setQrTitle(e.target.value)} placeholder="Button label (e.g. Hours)" className="input-field text-xs" required />
              <textarea value={qrText} onChange={(e) => setQrText(e.target.value)} placeholder="Reply text..." rows={2} className="input-field resize-none text-xs" required />
              <button type="submit" className="w-full py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-violet-600 to-indigo-600 text-white cursor-pointer">Save Quick Reply</button>
            </form>
          )}
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {quickReplies.length > 0 ? (
              quickReplies.map((qr) => (
                <div key={qr.id} className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-surface">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-default">{qr.title}</p>
                    <p className="text-[10px] text-faint truncate">{qr.text}</p>
                  </div>
                  <button onClick={async () => { await deleteQuickReply(qr.id); router.refresh(); }} className="p-1 text-muted hover:text-rose-400 transition-colors cursor-pointer">
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-faint text-center py-4">No quick replies saved</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
