"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/auth";

export default function LogoutButton() {
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
      title="Logout"
    >
      <LogOut className="size-4" />
    </button>
  );
}
