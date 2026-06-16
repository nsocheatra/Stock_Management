import { T } from "@/components/T";
import { db } from "@/lib/db";
import AutomationClient from "./AutomationClient";

export default async function AutomationPage() {
  const rules = await db.prepare("SELECT * FROM messenger_rules ORDER BY created_at DESC").all() as Array<{
    id: number; keyword: string; response: string; match_mode: string; category: string; enabled: number; times_triggered: number; created_at: string;
  }>;

  const quickReplies = await db.prepare("SELECT * FROM messenger_quick_replies ORDER BY created_at DESC").all() as Array<{
    id: number; title: string; text: string; payload: string;
  }>;

  const stats = {
    total: rules.length,
    active: rules.filter((r) => r.enabled).length,
    totalTriggered: rules.reduce((s, r) => s + r.times_triggered, 0),
    categories: [...new Set(rules.map((r) => r.category))],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-default"><T k="fbLive.automation.title" /></h2>
          <p className="text-sm text-faint mt-1"><T k="fbLive.automation.subtitle" /></p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <p className="text-xs font-bold text-violet-300">{stats.active}/{stats.total}</p>
            <p className="text-[10px] text-faint"><T k="fbLive.automation.rulesActive" /></p>
          </div>
          <div className="text-center px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-xs font-bold text-emerald-300">{stats.totalTriggered}</p>
            <p className="text-[10px] text-faint"><T k="fbLive.automation.triggered" /></p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {["general", "greeting", "support", "sales"].map((cat) => {
          const count = rules.filter((r) => r.category === cat).length;
          const activeCount = rules.filter((r) => r.category === cat && r.enabled).length;
          const colors: Record<string, string> = {
            general: "from-zinc-500 to-zinc-600",
            greeting: "from-emerald-500 to-teal-500",
            support: "from-blue-500 to-indigo-500",
            sales: "from-amber-500 to-orange-500",
          };
          return (
            <div key={cat} className="bg-surface-blur border border-surface rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`size-2 rounded-full bg-gradient-to-br ${colors[cat] || "from-zinc-500 to-zinc-600"}`} />
                <span className="text-[10px] font-semibold text-muted uppercase tracking-wider"><T k={"fbLive.automation.categories." + cat} /></span>
              </div>
              <p className="text-lg font-bold text-default">{count}</p>
              <p className="text-[10px] text-faint"><T k="fbLive.automation.active" vars={{ count: activeCount }} /></p>
            </div>
          );
        })}
      </div>

      {/* Built-in commands */}
      <div className="bg-surface-blur border border-surface rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-default"><T k="fbLive.automation.builtInCommands" /></h3>
          <span className="text-[10px] text-faint"><T k="fbLive.automation.alwaysActive" /></span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { cmd: "menu, start, help", desc: "Main menu with quick replies", icon: "📋" },
            { cmd: "products, list", desc: "List all products", icon: "📦" },
            { cmd: "low stock, lowstock", desc: "Low stock alerts", icon: "⚠️" },
            { cmd: "&lt;product name&gt;", desc: "Search products by name", icon: "🔍" },
          ].map((item) => (
            <div key={item.cmd} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/20 border border-surface">
              <span className="text-lg">{item.icon}</span>
              <div className="min-w-0">
                <code className="text-xs font-mono text-violet-300 block truncate">{item.cmd}</code>
                <span className="text-[10px] text-faint">{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AutomationClient rules={rules} quickReplies={quickReplies} />
    </div>
  );
}
