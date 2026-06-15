"use client";

import { type ReactNode } from "react";
import { I18nProvider } from "@/i18n/I18nProvider";
import SidebarNav from "@/components/SidebarNav";
import ThemeToggle from "@/components/ThemeToggle";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import LogoutButton from "@/components/LogoutButton";
import { T } from "@/components/T";
import { Warehouse } from "lucide-react";

type User = { name: string; role: string } | null;
type NavItem = { href: string; label: string; icon: string };

export default function LayoutClient({
  children,
  user,
  navItems,
  initialLocale,
}: {
  children: ReactNode;
  user: User;
  navItems: NavItem[];
  initialLocale?: "en" | "kh";
}) {
  return (
    <I18nProvider initialLocale={initialLocale}>
      <div className="flex h-screen w-screen relative">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none" style={{ backgroundColor: "var(--glow-1)" }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none" style={{ backgroundColor: "var(--glow-2)" }} />

        {/* Sidebar */}
        <aside className="w-64 backdrop-blur-xl border-r flex flex-col z-10" style={{ backgroundColor: "var(--bg-sidebar)", borderColor: "var(--sidebar-border)" }}>
          <div className="p-6 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold flex items-center gap-2.5 bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg" style={{ boxShadow: "0 4px 20px -5px rgba(139, 92, 246, 0.3)" }}>
                  <Warehouse className="size-5 text-white" />
                </div>
                <T k="app.title" />
              </h1>
              <ThemeToggle />
            </div>
          </div>
          
          <SidebarNav items={navItems} />

          <LocaleSwitcher />

          {/* User info & logout */}
          <div className="p-4 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
            {user ? (
              <div className="flex items-center gap-3">
                <div className={`size-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-md ${
                  user.role === "admin" ? "bg-gradient-to-tr from-violet-500 to-indigo-500" : "bg-gradient-to-tr from-emerald-500 to-teal-500"
                }`}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{user.name}</p>
                  <p className="text-[10px] truncate capitalize" style={{ color: "var(--text-secondary)" }}>{user.role}</p>
                </div>
                <LogoutButton />
              </div>
            ) : null}
          </div>
        </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-auto p-8 z-10 relative" style={{ backgroundColor: "var(--bg-main)" }}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </I18nProvider>
  );
}
