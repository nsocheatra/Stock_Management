"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithPin, loginWithGoogle } from "@/lib/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";
import { useTranslation } from "@/i18n/useTranslation";

export default function LoginForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
      router.push("/pos");
      router.refresh();
    } else {
      setError(result.error || t("login.invalidPin"));
    }
  };

  return (
    <div className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl space-y-4">
      <form onSubmit={handlePinLogin} className="space-y-4">
        <div>
          <label className="input-label">{t("login.cashierPin")}</label>
          <input name="pin" type="password" inputMode="numeric" required className="input-field text-center text-2xl tracking-[0.5em] font-mono" placeholder={t("login.pinPlaceholder")} maxLength={6} />
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
        onClick={async () => {
          setError("");
          setLoading(true);
          try {
            const result = await signInWithPopup(auth, googleProvider);
            const idToken = await result.user.getIdToken();
            const res = await loginWithGoogle(idToken);
            if (res.success) {
              router.push("/pos");
              router.refresh();
            } else {
              setError(res.error || "Google sign-in failed");
            }
          } catch {
            setError("Google sign-in cancelled or failed");
          } finally {
            setLoading(false);
          }
        }}
        disabled={loading}
        className="w-full py-3 rounded-xl font-semibold text-sm border border-zinc-700/50 bg-zinc-800/50 text-white hover:bg-zinc-700/50 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <svg className="size-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {loading ? "Signing in..." : "Sign in with Google"}
      </button>

      {error && (
        <div className="text-xs text-center py-2 rounded-lg bg-rose-500/10 text-rose-400">{error}</div>
      )}

      <p className="text-[10px] text-faint text-center">{t("login.defaultHint")}</p>
    </div>
  );
}
