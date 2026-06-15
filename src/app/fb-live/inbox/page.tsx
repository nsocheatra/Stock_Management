import { T } from "@/components/T";
import { db } from "@/lib/db";
import InboxClient from "./InboxClient";

export default function InboxPage() {
  const conversations = db.prepare("SELECT * FROM messenger_conversations ORDER BY updated_at DESC LIMIT 50").all() as Array<{
    id: number; sender_id: string; sender_name: string; last_message: string; unread: number; tags: string; assigned_to: string; updated_at: string;
  }>;

  const messagesMap: Record<number, Array<{ id: number; sender: string; text: string; created_at: string }>> = {};
  for (const conv of conversations) {
    messagesMap[conv.id] = db.prepare(
      "SELECT * FROM messenger_messages WHERE conversation_id = ? ORDER BY created_at ASC"
    ).all(conv.id) as Array<{ id: number; sender: string; text: string; created_at: string }>;
  }

  const quickReplies = db.prepare("SELECT * FROM messenger_quick_replies ORDER BY created_at DESC").all() as Array<{
    id: number; title: string; text: string; payload: string;
  }>;

  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);

  return (
    <div className="h-[calc(100vh-220px)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-default"><T k="fbLive.inbox.title" /></h2>
          {totalUnread > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold">
              <T k="fbLive.inbox.unread" vars={{ count: totalUnread }} />
            </span>
          )}
        </div>
        <span className="text-xs text-faint"><T k="fbLive.inbox.conversations" vars={{ count: conversations.length }} /></span>
      </div>

      <div className="flex-1 bg-surface-blur border-surface rounded-2xl shadow-xl overflow-hidden">
        <InboxClient conversations={conversations} messagesMap={messagesMap} quickReplies={quickReplies} />
      </div>
    </div>
  );
}
