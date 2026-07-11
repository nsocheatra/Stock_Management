import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Khmer } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import LayoutClient from "@/components/LayoutClient";
import { LangUpdater } from "@/components/LangUpdater";
import PWARegister from "@/components/PWARegister";
import { getCurrentUser } from "@/lib/auth";
import { cookies } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansKhmer = Noto_Sans_Khmer({
  variable: "--font-noto-sans-khmer",
  subsets: ["khmer"],
  weight: ["300", "400", "500", "600", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: "Stock Management System",
  description: "Manage products, stock, and suppliers",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Stock Manager",
  },
  icons: {
    apple: "/icon-192.svg",
  },
};

const navItems = [
  { href: "/pos", label: "POS", icon: "pos", permission: "pos.access" as const },
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/customers", label: "Customers", icon: "customers", permission: "customers.manage" as const },
  { href: "/products", label: "Products", icon: "products", permission: "products.manage" as const },
  { href: "/stock", label: "Inventory", icon: "stock", permission: "stock.manage" as const },
  { href: "/stock/count", label: "Stock Count", icon: "audit", permission: "audit.manage" as const },
  { href: "/orders", label: "Orders", icon: "orders", permission: "orders.manage" as const },
  { href: "/debts", label: "Debts", icon: "debts", permission: "debts.manage" as const },
  { href: "/cash-flow", label: "Cash Flow", icon: "cashflow", permission: "cashflow.manage" as const },
  { href: "/promotions", label: "Promotions", icon: "promotions", permission: "promotions.manage" as const },
  { href: "/membership", label: "Membership", icon: "membership", permission: "membership.manage" as const },
  { href: "/suppliers", label: "Suppliers", icon: "suppliers", permission: "suppliers.manage" as const },
  { href: "/delivery", label: "Delivery", icon: "delivery", permission: "delivery.manage" as const },
  { href: "/notifications", label: "Notifications", icon: "notifications", permission: "notifications.view" as const },
  { href: "/reports", label: "Reports", icon: "reports", permission: "reports.view" as const },
  { href: "/settings", label: "Settings", icon: "settings", permission: "settings.manage" as const },
  { href: "/users", label: "Users", icon: "users", permission: "users.manage" as const },
];

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("locale")?.value;
  const initialLocale = localeCookie === "kh" ? "kh" : "en";

  return (
    <html
      lang={initialLocale}
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansKhmer.variable} antialiased dark`}
      suppressHydrationWarning
    >
      <body className="overflow-hidden" style={{ backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }}>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{
          __html: `
            try {
              var t = localStorage.getItem("theme");
              if (t === "dark" || (!t && matchMedia("(prefers-color-scheme: dark)").matches)) {
                document.documentElement.classList.add("dark");
              } else {
                document.documentElement.classList.remove("dark");
              }
            } catch(e) {}
          `
        }} />
        <PWARegister />
        <LangUpdater />
        <LayoutClient user={user} navItems={navItems} initialLocale={initialLocale}>
          {children}
        </LayoutClient>
      </body>
    </html>
  );
}
