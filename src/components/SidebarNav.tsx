"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/i18n/useTranslation";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Truck,
  BarChart3,
  ShoppingCart,
  Radio,
  Settings,
  Users,
  UserRound,
  ClipboardList,
  ReceiptText,
  Gem,
  HandCoins,
  Wallet,
  Percent,

} from "lucide-react";

const iconMap: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  products: Package,
  stock: Warehouse,
  suppliers: Truck,
  reports: BarChart3,
  pos: ShoppingCart,
  fblive: Radio,
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
};

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export default function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
      {items.map((item) => {
        const Icon = iconMap[item.icon];
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
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
            <span className="text-sm font-medium">{t("nav." + item.icon)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
