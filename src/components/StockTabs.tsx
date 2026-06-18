"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const tabs = [
  { href: "/stock", label: "Overview" },
  { href: "/stock/batches", label: "Batches" },
  { href: "/stock/locations", label: "Locations" },
  { href: "/stock/movements", label: "Movements" },
];

export default function StockTabs() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 bg-surface-blur border-surface rounded-xl p-1 shadow-lg overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              isActive
                ? "bg-violet-500/15 text-violet-300 shadow-sm"
                : "text-muted hover:text-default hover-surface"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
