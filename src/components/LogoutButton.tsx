"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/auth";
import { useTranslation } from "@/i18n/useTranslation";

export default function LogoutButton() {
  const { t } = useTranslation();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="p-2 rounded-lg text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
      title={t("nav.logout")}
    >
      <LogOut className="size-4" />
    </button>
  );
}
