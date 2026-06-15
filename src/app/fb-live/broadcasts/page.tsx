import { T } from "@/components/T";
import { db } from "@/lib/db";
import BroadcastsClient from "./BroadcastsClient";

export default function BroadcastsPage() {
  const broadcasts = db.prepare("SELECT * FROM messenger_broadcasts ORDER BY created_at DESC LIMIT 50").all() as Array<{
    id: number; name: string; message: string; recipient_count: number; sent_count: number; status: string; scheduled_at: string | null; created_at: string;
  }>;

  const templates = db.prepare("SELECT * FROM messenger_templates ORDER BY created_at DESC").all() as Array<{
    id: number; name: string; message: string;
  }>;

  const totalSent = broadcasts.filter((b) => b.status === "sent").reduce((s, b) => s + b.sent_count, 0);
  const totalRecipients = broadcasts.filter((b) => b.status === "sent").reduce((s, b) => s + b.recipient_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-default"><T k="fbLive.broadcasts.title" /></h2>
          <p className="text-sm text-faint mt-1"><T k="fbLive.broadcasts.subtitle" /></p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-xs font-bold text-emerald-300">{totalSent}</p>
            <p className="text-[10px] text-faint"><T k="fbLive.broadcasts.sent" /></p>
          </div>
          <div className="text-center px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <p className="text-xs font-bold text-violet-300">{totalRecipients}</p>
            <p className="text-[10px] text-faint"><T k="fbLive.broadcasts.reached" /></p>
          </div>
        </div>
      </div>

      <BroadcastsClient broadcasts={broadcasts} templates={templates} />
    </div>
  );
}
