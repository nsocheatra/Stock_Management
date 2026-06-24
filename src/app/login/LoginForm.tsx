"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithPin, loginWithEmail } from "@/lib/auth";
import { useTranslation } from "@/i18n/useTranslation";

export default function LoginForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"pin" | "email">("pin");
  const router = useRouter();
  const { t } = useTranslation();

  const handlePinLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const pin = fd.get("pin") as string;
    const result = await loginWithPin(pin);
    setLoading(false);
    if (result.success) {
      router.push(result.user?.role === "cashier" ? "/pos" : "/");
      router.refresh();
    } else {
      setError(result.error || t("login.invalidPin"));
    }
  };

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;
    const result = await loginWithEmail(email, password);
    setLoading(false);
    if (result.success) {
      router.push(result.user?.role === "cashier" ? "/pos" : "/");
      router.refresh();
    } else {
      setError(result.error || "Login failed");
    }
  };

  if (mode === "email") {
    return (
      <div className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl space-y-4">
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="input-label">Email</label>
            <input name="email" type="email" required className="input-field" placeholder="admin@example.com" />
          </div>
          <div>
            <label className="input-label">Password</label>
            <input name="password" type="password" required className="input-field" placeholder="Enter password" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/15 cursor-pointer">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <button type="button" onClick={() => setMode("pin")} className="w-full text-xs text-faint hover:text-white transition-colors cursor-pointer">
          Back to PIN login
        </button>

        {error && (
          <div className="text-xs text-center py-2 rounded-lg bg-rose-500/10 text-rose-400">{error}</div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl space-y-4">
      <form onSubmit={handlePinLogin} className="space-y-4">
        <div>
          <label className="input-label">{t("login.cashierPin")}</label>
          <input name="pin" type="password" inputMode="numeric" required className="input-field text-center text-2xl tracking-[0.5em] font-mono" placeholder={t("login.pinPlaceholder")} maxLength={10} />
        </div>
        <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/15 cursor-pointer">
          {loading ? t("login.quickLoginLoading") : t("login.quickLogin")}
        </button>
      </form>

      <div className="relative flex items-center gap-2 py-1">
        <div className="flex-1 h-px bg-zinc-700/50" />
        <span className="text-[10px] text-faint uppercase tracking-wider">or</span>
        <div className="flex-1 h-px bg-zinc-700/50" />
      </div>

      <button
        type="button"
        onClick={() => setMode("email")}
        disabled={loading}
        className="w-full py-3 rounded-xl font-semibold text-sm border border-zinc-700/50 bg-zinc-800/50 text-white hover:bg-zinc-700/50 disabled:opacity-50 transition-all cursor-pointer"
      >
        Sign in with Email
      </button>

      {error && (
        <div className="text-xs text-center py-2 rounded-lg bg-rose-500/10 text-rose-400">{error}</div>
      )}

      <p className="text-[10px] text-faint text-center">{t("login.defaultHint")}</p>
    </div>
  );
}
