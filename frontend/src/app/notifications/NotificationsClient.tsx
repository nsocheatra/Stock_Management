"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/i18n/useTranslation";
import { Bell, Package, Clock, AlertTriangle, Check, CheckCheck, Trash2, RefreshCw } from "lucide-react";
import { markNotificationRead, markAllNotificationsRead, clearAllNotifications, generateStockNotifications } from "@/server/actions";

type Notification = {
  id: number; type: string; title: string; message: string;
  reference_type: string | null; reference_id: number | null;
  is_read: number; created_at: string;
};

const typeIcons: Record<string, typeof Package> = {
  low_stock: AlertTriangle,
  expiring_batch: Clock,
  expired_batch: Clock,
  info: Bell,
};

const typeColors: Record<string, string> = {
  low_stock: "text-rose-400 bg-rose-500/10",
  expiring_batch: "text-amber-400 bg-amber-500/10",
  expired_batch: "text-red-400 bg-red-500/10",
  info: "text-blue-400 bg-blue-500/10",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr + "Z").getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsClient({
  notifications: initial,
  unreadCount: initialUnread,
}: {
  notifications: Notification[];
  unreadCount: number;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [notifications, setNotifications] = useState(initial);
  const [unreadCount, setUnreadCount] = useState(initialUnread);
  const [generating, setGenerating] = useState(false);

  async function handleMarkRead(id: number) {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    setUnreadCount(0);
  }

  async function handleClearAll() {
    await clearAllNotifications();
    setNotifications([]);
    setUnreadCount(0);
  }

  async function handleRefresh() {
    setGenerating(true);
    await generateStockNotifications();
    router.refresh();
    setGenerating(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            <T k="notifications.title" />
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            <T k="notifications.subtitle" vars={{ count: unreadCount }} />
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={generating}
            className="px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2"
            style={{ backgroundColor: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}
          >
            <RefreshCw className={`size-4 ${generating ? "animate-spin" : ""}`} />
            <T k="common.refresh" />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2"
              style={{ backgroundColor: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}
            >
              <CheckCheck className="size-4" />
              <T k="notifications.markAllRead" />
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2"
              style={{ backgroundColor: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}
            >
              <Trash2 className="size-4" />
              <T k="notifications.clearAll" />
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Bell className="size-12 mb-4 opacity-30" style={{ color: "var(--text-secondary)" }} />
          <p className="font-medium" style={{ color: "var(--text-primary)" }}>
            <T k="notifications.empty" />
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            <T k="notifications.emptyHint" />
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = typeIcons[n.type] || Bell;
            return (
              <div
                key={n.id}
                className={`rounded-xl border p-4 transition-all duration-200 flex items-start gap-4 ${
                  n.is_read ? "opacity-60" : ""
                }`}
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-color)",
                }}
              >
                <div className={`p-2.5 rounded-xl shrink-0 ${typeColors[n.type] || "text-zinc-400 bg-zinc-500/10"}`}>
                  <Icon className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                        {n.title}
                      </p>
                      <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        {n.message}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                        {timeAgo(n.created_at)}
                      </span>
                      {!n.is_read && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-zinc-700/50"
                          style={{ color: "var(--text-secondary)" }}
                          title={t("common.markRead")}
                        >
                          <Check className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function T({ k, vars }: { k: string; vars?: Record<string, string | number> }) {
  const { t } = useTranslation();
  const val = t(k as any);
  if (!vars) return <>{val}</>;
  let result = val;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(`{${key}}`, String(value));
  }
  return <>{result}</>;
}
