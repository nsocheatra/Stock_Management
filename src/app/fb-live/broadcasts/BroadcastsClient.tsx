"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Megaphone, Send, Trash2, CheckCircle, XCircle, Clock,
  FileText, Calendar, Plus, Edit3, Save,
} from "lucide-react";
import {
  createBroadcast, updateBroadcast, sendBroadcast, deleteBroadcast,
  addTemplate,
} from "@/lib/actions";
import { useTranslation } from "@/i18n/useTranslation";

interface Broadcast {
  id: number; name: string; message: string; recipient_count: number;
  sent_count: number; status: string; scheduled_at: string | null; created_at: string;
}

interface Template {
  id: number; name: string; message: string;
}

export default function BroadcastsClient({ broadcasts, templates }: { broadcasts: Broadcast[]; templates: Template[] }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [sending, setSending] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [tmplName, setTmplName] = useState("");
  const [tmplMsg, setTmplMsg] = useState("");
  const router = useRouter();
  const { t } = useTranslation();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    const fd = new FormData();
    fd.set("name", name.trim() || t("fbLive.main.untitled"));
    fd.set("message", message.trim());
    fd.set("scheduled_at", scheduledAt || "");
    await createBroadcast(fd);
    setName(""); setMessage(""); setScheduledAt("");
    router.refresh();
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const fd = new FormData();
    fd.set("id", String(editingId));
    fd.set("name", editName.trim() || t("fbLive.main.untitled"));
    fd.set("message", editMessage.trim());
    await updateBroadcast(fd);
    setEditingId(null);
    router.refresh();
  };

  const handleSend = async (id: number) => {
    setSending(id);
    await sendBroadcast(id);
    setSending(null);
    router.refresh();
  };

  const applyTemplate = (tmpl: Template) => {
    setMessage(tmpl.message);
    setShowTemplates(false);
  };

  const saveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmplName.trim() || !tmplMsg.trim()) return;
    const fd = new FormData();
    fd.set("name", tmplName.trim());
    fd.set("message", tmplMsg.trim());
    await addTemplate(fd);
    setTmplName(""); setTmplMsg("");
    router.refresh();
  };

  const statusIcon: Record<string, typeof CheckCircle> = {
    draft: Clock, sending: Clock, sent: CheckCircle, failed: XCircle,
  };
  const statusColor: Record<string, string> = {
    draft: "text-muted", sending: "text-amber-400", sent: "text-emerald-400", failed: "text-rose-400",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Create Broadcast */}
      <div className="lg:col-span-2 bg-surface-blur border-surface rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-semibold text-default flex items-center gap-2">
          <Megaphone className="size-4 text-muted" />
          {t("fbLive.broadcasts.newCampaign")}
        </h3>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="input-label">{t("fbLive.broadcasts.campaignName")}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("fbLive.broadcasts.campaignNamePlaceholder")} className="input-field" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="input-label mb-0">{t("fbLive.broadcasts.message")}</label>
              {templates.length > 0 && (
                <button type="button" onClick={() => setShowTemplates(!showTemplates)} className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1 cursor-pointer">
                  <FileText className="size-3" /> {t("fbLive.broadcasts.templates")}
                </button>
              )}
            </div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("fbLive.broadcasts.messagePlaceholder")} rows={5} className="input-field resize-none" required />
          </div>

          {showTemplates && templates.length > 0 && (
            <div className="space-y-1 p-2 rounded-xl bg-black/20 border border-surface max-h-32 overflow-y-auto">
              {templates.map((t) => (
                <button key={t.id} type="button" onClick={() => applyTemplate(t)}
                  className="w-full text-left p-2 rounded-lg hover:bg-surface text-xs text-muted transition-colors cursor-pointer">
                  <span className="font-semibold text-default">{t.name}</span>
                  <p className="text-[10px] text-faint truncate">{t.message}</p>
                </button>
              ))}
            </div>
          )}

          <div>
            <label className="input-label flex items-center gap-2">
              <Calendar className="size-3" /> {t("fbLive.broadcasts.schedule")}
            </label>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="input-field" />
          </div>

          <div className="bg-black/20 rounded-xl p-3 border border-surface">
            <p className="text-xs text-faint">
              {t("fbLive.broadcasts.recipients", { count: broadcasts.length > 0 ? (broadcasts[0].recipient_count || "all") : "all" })}
            </p>
          </div>

          <button type="submit" className="w-full py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/15 border border-violet-500/20 cursor-pointer">
            <Save className="size-4 inline mr-1" />
            {scheduledAt ? t("fbLive.broadcasts.scheduleBroadcast") : t("fbLive.broadcasts.saveDraft")}
          </button>
        </form>

        {/* Save as template */}
        <details className="text-xs">
          <summary className="text-violet-400 hover:text-violet-300 cursor-pointer font-medium">{t("fbLive.broadcasts.saveAsTemplate")}</summary>
          <form onSubmit={saveTemplate} className="mt-2 space-y-2 p-3 rounded-xl bg-black/20 border border-surface">
            <input value={tmplName} onChange={(e) => setTmplName(e.target.value)} placeholder={t("fbLive.broadcasts.templateNamePlaceholder")} className="input-field text-xs" required />
            <textarea value={tmplMsg} onChange={(e) => setTmplMsg(e.target.value)} placeholder={t("fbLive.broadcasts.templateMessagePlaceholder")} rows={2} className="input-field resize-none text-xs" required />
            <button type="submit" className="w-full py-1.5 rounded-lg text-xs font-medium bg-violet-600/30 text-violet-300 hover:bg-violet-600/40 transition-colors cursor-pointer">
              <Plus className="size-3 inline mr-1" /> {t("fbLive.broadcasts.saveTemplate")}
            </button>
          </form>
        </details>
      </div>

      {/* Broadcasts List */}
      <div className="lg:col-span-3 bg-surface-blur border-surface rounded-2xl p-5 shadow-xl space-y-3">
        <h3 className="text-sm font-semibold text-default flex items-center justify-between">
          <span>{t("fbLive.broadcasts.campaigns", { count: broadcasts.length })}</span>
          {templates.length > 0 && (
            <span className="text-[10px] text-faint">{t("fbLive.broadcasts.templatesCount", { count: templates.length })}</span>
          )}
        </h3>
        {broadcasts.length > 0 ? (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {broadcasts.map((b) => {
              const StatIcon = statusIcon[b.status] || Clock;
              return (
                <div key={b.id} className="p-3 rounded-xl border border-surface space-y-2">
                  {editingId === b.id ? (
                    <div className="space-y-2">
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} className="input-field text-xs" placeholder={t("fbLive.broadcasts.campaignName")} />
                      <textarea value={editMessage} onChange={(e) => setEditMessage(e.target.value)} rows={3} className="input-field resize-none text-xs" />
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 cursor-pointer"><CheckCircle className="size-3 inline mr-1" />{t("common.save")}</button>
                        <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface text-muted hover:text-default cursor-pointer">{t("common.cancel")}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-default truncate">{b.name}</p>
                          <p className="text-xs text-muted line-clamp-2 mt-0.5">{b.message}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => { setEditingId(b.id); setEditName(b.name); setEditMessage(b.message); }} className="p-1.5 rounded-lg text-muted hover:text-violet-400 hover:bg-violet-500/10 transition-colors cursor-pointer">
                            <Edit3 className="size-3" />
                          </button>
                          {b.status === "draft" && (
                            <button onClick={() => handleSend(b.id)} disabled={sending === b.id}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer">
                              <Send className="size-3" />
                              {sending === b.id ? t("fbLive.broadcasts.sending_") : t("fbLive.broadcasts.send")}
                            </button>
                          )}
                          <button onClick={async () => { await deleteBroadcast(b.id); router.refresh(); }} className="p-1.5 rounded-lg text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer">
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-faint">
                        <div className="flex items-center gap-2">
                          <StatIcon className={`size-3 ${statusColor[b.status] || "text-muted"}`} />
                          <span className={`capitalize font-medium ${statusColor[b.status] || "text-muted"}`}>{t("fbLive.broadcasts.statuses." + b.status)}</span>
                          {b.status === "sent" && <span>{t("fbLive.broadcasts.delivery", { sent: b.sent_count, total: b.recipient_count })}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          {b.scheduled_at && <span><Calendar className="size-3 inline mr-1" />{new Date(b.scheduled_at).toLocaleString()}</span>}
                          <span>{new Date(b.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-faint">
            <Megaphone className="size-6 mx-auto mb-2 opacity-40" />
            <p className="text-sm">{t("fbLive.broadcasts.noCampaigns")}</p>
            <p className="text-xs mt-1">{t("fbLive.broadcasts.noCampaignsHint")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
