"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio, Bot, Brain, MessageSquare, Megaphone, Settings } from "lucide-react";

const tabs = [
  { href: "/fb-live", label: "Live", icon: Radio, matchExact: true },
  { href: "/fb-live/automation", label: "Automation", icon: Bot },
  { href: "/fb-live/ai", label: "AI", icon: Brain },
  { href: "/fb-live/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/fb-live/broadcasts", label: "Broadcasts", icon: Megaphone },
  { href: "/fb-live/settings", label: "Settings", icon: Settings },
];

export default function FBLiveLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
