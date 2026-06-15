"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare, Send, User, Bot, ArrowLeft, Search,
  Tag, UserPlus, CheckCircle, X,
} from "lucide-react";
import {
  replyToConversation, markConversationRead, assignConversation, tagConversation,
  searchConversations, importFBPageConversations,
} from "@/lib/actions";
import { useTranslation } from "@/i18n/useTranslation";

interface Conv {
  id: number; sender_id: string; sender_name: string; last_message: string;
  unread: number; tags: string; assigned_to: string; updated_at: string;
}

interface Msg {
  id: number; sender: string; text: string; created_at: string;
}

interface QR {
  id: number; title: string; text: string; payload: string;
}

function timeAgo(dateStr: string, t: (key: string, vars?: Record<string, string | number>) => string) {
  const diff = Date.now() - new Date(dateStr + "Z").getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("common.justNow");
  if (mins < 60) return t("common.minutesAgo", { n: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("common.hoursAgo", { n: hrs });
  const days = Math.floor(hrs / 24);
  return t("common.daysAgo", { n: days });
}

const tagColors: Record<string, string> = {
  support: "bg-blue-500/20 text-blue-300",
  sales: "bg-amber-500/20 text-amber-300",
  vip: "bg-purple-500/20 text-purple-300",
  complaint: "bg-rose-500/20 text-rose-300",
  general: "bg-zinc-500/20 text-zinc-300",
};

export default function InboxClient({
  conversations: initialConvs, messagesMap, quickReplies, pageConnected,
}: {
  conversations: Conv[]; messagesMap: Record<number, Msg[]>; quickReplies: QR[]; pageConnected: boolean;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState(initialConvs);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [showAssign, setShowAssign] = useState(false);
  const [assignInput, setAssignInput] = useState("");
  const importingRef = useRef(false);
  const router = useRouter();
  const { t } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedId, messagesMap]);

  useEffect(() => {
    if (pageConnected && initialConvs.length === 0 && !importingRef.current) {
      importingRef.current = true;
      importFBPageConversations().then((result) => {
        if (result.success) router.refresh();
      });
    }
  }, [pageConnected, initialConvs.length, router]);

  const selected = conversations.find((c) => c.id === selectedId);
  const messages = selectedId ? messagesMap[selectedId] || [] : [];

  const handleSelect = async (id: number) => {
    setSelectedId(id);
    await markConversationRead(id);
    router.refresh();
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !selectedId || sending) return;
    setSending(true);
    const fd = new FormData();
    fd.set("conversation_id", String(selectedId));
    fd.set("text", text.trim());
    await replyToConversation(fd);
    setSending(false);
    setText("");
    router.refresh();
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) { setConversations(initialConvs); return; }
    const fd = new FormData();
    fd.set("query", searchQuery);
    const results = await searchConversations(fd);
    setConversations(results as Conv[]);
  };

  const handleQuickReply = (qr: QR) => {
    setText(qr.text);
  };

  const handleTag = async () => {
    if (!selectedId || !tagInput.trim()) return;
    const fd = new FormData();
    fd.set("id", String(selectedId));
    fd.set("tags", tagInput.trim());
    await tagConversation(fd);
    setTagInput("");
    setShowTagInput(false);
    router.refresh();
  };

  const handleAssign = async () => {
    if (!selectedId || !assignInput.trim()) return;
    const fd = new FormData();
    fd.set("id", String(selectedId));
    fd.set("assigned_to", assignInput.trim());
    await assignConversation(fd);
    setAssignInput("");
    setShowAssign(false);
    router.refresh();
  };

  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <div className="w-72 border-r border-surface flex flex-col shrink-0">
        <div className="p-3 border-b border-surface space-y-2">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted" />
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value.trim()) setConversations(initialConvs);
              }}
              placeholder={t("fbLive.inbox.searchPlaceholder")}
              className="input-field pl-8 text-xs"
            />
          </form>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length > 0 ? (
            conversations.map((conv) => {
              const tags = conv.tags ? conv.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelect(conv.id)}
                  className={`w-full text-left p-3 border-b border-surface transition-colors cursor-pointer ${
                    selectedId === conv.id
                      ? "bg-violet-600/15 border-l-2 border-l-violet-500"
                      : conv.unread > 0
                      ? "bg-emerald-500/5"
                      : "hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {(conv.sender_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold text-default truncate">{conv.sender_name}</p>
                        <span className="text-[10px] text-faint shrink-0">{timeAgo(conv.updated_at, t)}</span>
                      </div>
                      <p className="text-[10px] text-faint truncate">{conv.last_message || "—"}</p>
                      {tags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {tags.slice(0, 2).map((tag) => (
                            <span key={tag} className={`text-[8px] px-1 py-0.5 rounded ${tagColors[tag] || tagColors.general}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {conv.assigned_to && (
                        <p className="text-[9px] text-violet-400 mt-0.5">👤 {conv.assigned_to}</p>
                      )}
                    </div>
                    {conv.unread > 0 && (
                      <span className="size-2 rounded-full bg-emerald-400 shrink-0" />
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-center py-12 text-faint px-4">
              <MessageSquare className="size-6 mx-auto mb-2 opacity-40" />
              <p className="text-xs">
                {pageConnected ? t("fbLive.inbox.noConversations") : "Connect a Facebook page to use the inbox."}
              </p>
              <p className="text-[10px] mt-1">
                {pageConnected
                  ? t("fbLive.inbox.noConversationsHint")
                  : "Go to Settings and sign in with Facebook to import conversations."}
              </p>
              {!pageConnected && (
                <a
                  href="/fb-live/settings"
                  className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600/20 text-violet-300 border border-violet-500/20 hover:bg-violet-600/30 transition-all"
                >
                  Connect Facebook
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selected ? (
          <>
            <div className="p-3 border-b border-surface flex items-center gap-2 flex-wrap">
              <button onClick={() => setSelectedId(null)} className="md:hidden p-1 text-muted hover:text-default cursor-pointer">
                <ArrowLeft className="size-4" />
              </button>
              <div className="size-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                {selected.sender_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-default">{selected.sender_name}</p>
                  <span className="text-[10px] text-faint">{timeAgo(selected.updated_at, t)}</span>
                </div>
                <p className="text-[10px] text-faint">{t("fbLive.inbox.id", { id: selected.sender_id })}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setShowTagInput(!showTagInput)} className="p-1.5 rounded-lg text-muted hover:text-violet-400 hover:bg-violet-500/10 transition-colors cursor-pointer" title={t("fbLive.inbox.tag")}>
                  <Tag className="size-3.5" />
                </button>
                <button onClick={() => setShowAssign(!showAssign)} className="p-1.5 rounded-lg text-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer" title={t("fbLive.inbox.assign")}>
                  <UserPlus className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Tag/Assign inline forms */}
            {showTagInput && (
              <div className="p-2 border-b border-surface flex gap-2 bg-black/20">
                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder={t("fbLive.inbox.tagPlaceholder")} className="input-field text-xs flex-1" />
                <button onClick={handleTag} className="px-2 py-1 rounded-lg text-xs bg-violet-600/30 text-violet-300 cursor-pointer"><CheckCircle className="size-3" /></button>
                <button onClick={() => setShowTagInput(false)} className="px-2 py-1 rounded-lg text-xs text-muted cursor-pointer"><X className="size-3" /></button>
              </div>
            )}
            {showAssign && (
              <div className="p-2 border-b border-surface flex gap-2 bg-black/20">
                <input value={assignInput} onChange={(e) => setAssignInput(e.target.value)} placeholder={t("fbLive.inbox.assignPlaceholder")} className="input-field text-xs flex-1" />
                <button onClick={handleAssign} className="px-2 py-1 rounded-lg text-xs bg-emerald-600/30 text-emerald-300 cursor-pointer"><CheckCircle className="size-3" /></button>
                <button onClick={() => setShowAssign(false)} className="px-2 py-1 rounded-lg text-xs text-muted cursor-pointer"><X className="size-3" /></button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === "bot" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex items-start gap-2 max-w-[80%] ${msg.sender === "bot" ? "flex-row-reverse" : ""}`}>
                    <div className={`size-6 rounded-full flex items-center justify-center shrink-0 ${
                      msg.sender === "bot" ? "bg-violet-500/20" : "bg-zinc-600/30"
                    }`}>
                      {msg.sender === "bot" ? <Bot className="size-3 text-violet-400" /> : <User className="size-3 text-muted" />}
                    </div>
                    <div>
                      <div className={`rounded-xl px-3 py-2 text-xs ${
                        msg.sender === "bot"
                          ? "bg-violet-600/20 text-violet-200 border border-violet-500/20"
                          : "bg-zinc-800/50 text-muted border border-surface"
                      }`}>
                        <p>{msg.text}</p>
                      </div>
                      <p className="text-[9px] text-faint mt-0.5 px-1">{timeAgo(msg.created_at, t)}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick replies */}
            {quickReplies.length > 0 && (
              <div className="px-3 py-2 border-t border-surface flex gap-1.5 overflow-x-auto">
                {quickReplies.map((qr) => (
                  <button
                    key={qr.id}
                    onClick={() => handleQuickReply(qr)}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 hover:bg-violet-500/20 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {qr.title}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSend} className="p-3 border-t border-surface flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("fbLive.inbox.replyPlaceholder")} className="input-field flex-1 text-xs" disabled={sending} />
              <button type="submit" disabled={!text.trim() || sending} className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer">
                <Send className="size-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-faint">
            <div className="text-center">
              <MessageSquare className="size-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{t("fbLive.inbox.selectConversation")}</p>
              <p className="text-xs mt-1">{t("fbLive.inbox.selectConversationHint")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
