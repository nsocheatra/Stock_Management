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
  { href: "/pos", label: "POS", icon: "pos" },
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/fb-live", label: "FB Live", icon: "fblive" },
  { href: "/customers", label: "Customers", icon: "customers" },
  { href: "/products", label: "Products", icon: "products" },
  { href: "/stock", label: "Inventory", icon: "stock" },
  { href: "/audit", label: "Audit", icon: "audit" },
  { href: "/orders", label: "Orders", icon: "orders" },
  { href: "/debts", label: "Debts", icon: "debts" },
  { href: "/cash-flow", label: "Cash Flow", icon: "cashflow" },
  { href: "/promotions", label: "Promotions", icon: "promotions" },
  { href: "/membership", label: "Membership", icon: "membership" },
  { href: "/suppliers", label: "Suppliers", icon: "suppliers" },
  { href: "/delivery", label: "Delivery", icon: "delivery" },
  { href: "/reports", label: "Reports", icon: "reports" },
  { href: "/settings", label: "Settings", icon: "settings" },
  { href: "/users", label: "Users", icon: "users" },
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
