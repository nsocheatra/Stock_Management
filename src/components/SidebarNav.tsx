"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/i18n/useTranslation";
import { getUnreadNotificationCount } from "@/lib/actions";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Truck,
  BarChart3,
  ShoppingCart,
  Settings,
  Users,
  UserRound,
  ClipboardList,
  ReceiptText,
  Gem,
  HandCoins,
  Wallet,
  Percent,
  Layers,
  MapPin,
  Bell,
} from "lucide-react";

const iconMap: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  products: Package,
  stock: Warehouse,
  suppliers: Truck,
  reports: BarChart3,
  pos: ShoppingCart,
  settings: Settings,
  users: Users,
  customers: UserRound,
  audit: ClipboardList,
  orders: ReceiptText,
  delivery: Truck,
  debts: HandCoins,
  cashflow: Wallet,
  promotions: Percent,
  membership: Gem,
  batches: Layers,
  locations: MapPin,
  notifications: Bell,
};

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export default function SidebarNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    getUnreadNotificationCount().then(setUnreadCount).catch(() => {});
  }, [pathname]);

  return (
    <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
      {items.map((item) => {
        const Icon = iconMap[item.icon];
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        const showBadge = item.icon === "notifications" && unreadCount > 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              isActive
                ? "bg-gradient-to-r from-violet-600/20 to-indigo-600/5 border-l-2 border-violet-500 text-violet-300 shadow-md shadow-violet-950/20"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
            }`}
          >
            {Icon && (
              <Icon
                className={`size-5 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? "text-violet-400" : "text-zinc-500 group-hover:text-zinc-300"
                }`}
              />
            )}
            <span className="text-sm font-medium flex-1">{t("nav." + item.icon)}</span>
            {showBadge && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 leading-none">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
