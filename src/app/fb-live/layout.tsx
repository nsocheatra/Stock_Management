"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/i18n/useTranslation";
import { Radio, Bot, Brain, MessageSquare, Megaphone, Settings } from "lucide-react";

const tabDefs = [
  { href: "/fb-live", key: "fbLive.tabs.live", icon: Radio, matchExact: true },
  { href: "/fb-live/automation", key: "fbLive.tabs.automation", icon: Bot },
  { href: "/fb-live/ai", key: "fbLive.tabs.ai", icon: Brain },
  { href: "/fb-live/inbox", key: "fbLive.tabs.inbox", icon: MessageSquare },
  { href: "/fb-live/broadcasts", key: "fbLive.tabs.broadcasts", icon: Megaphone },
  { href: "/fb-live/settings", key: "fbLive.tabs.settings", icon: Settings },
];

export default function FBLiveLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const tabs = tabDefs.map((tab) => ({ ...tab, label: t(tab.key) }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Sub-navigation */}
      <div className="flex gap-1 rounded-xl bg-black/20 p-1 border border-surface overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.matchExact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? "bg-violet-600/30 text-violet-200 shadow-sm border border-violet-500/20"
                  : "text-muted hover:text-default hover:bg-white/5"
              }`}
            >
              <Icon className="size-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
