import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LayoutClient from "@/components/LayoutClient";
import { getCurrentUser } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stock Management System",
  description: "Manage products, stock, and suppliers",
};

const navItems = [
  { href: "/pos", label: "POS", icon: "pos" },
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/customers", label: "Customers", icon: "customers" },
  { href: "/products", label: "Products", icon: "products" },
  { href: "/stock", label: "Inventory", icon: "stock" },
  { href: "/fb-live", label: "FB Live", icon: "fblive" },
  { href: "/suppliers", label: "Suppliers", icon: "suppliers" },
  { href: "/reports", label: "Reports", icon: "reports" },
  { href: "/settings", label: "Settings", icon: "settings" },
  { href: "/users", label: "Users", icon: "users" },
];

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{
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
      </head>
      <body className="overflow-hidden" style={{ backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }}>
        <LayoutClient user={user} navItems={navItems}>
          {children}
        </LayoutClient>
      </body>
    </html>
  );
}
