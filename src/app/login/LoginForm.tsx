"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Eye, EyeOff, KeyRound } from "lucide-react";
import { login, loginWithPin } from "@/lib/auth";

export default function LoginForm() {
  const [mode, setMode] = useState<"credentials" | "pin">("credentials");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      router.push("/pos");
      router.refresh();
    } else {
      setError(result.error || "Login failed");
    }
  };

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
      setError(result.error || "Invalid PIN");
    }
  };

  return (
    <div className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl space-y-4">
      {/* Mode toggle */}
      <div className="flex rounded-xl bg-black/20 p-1 border border-surface">
        <button
          type="button"
          onClick={() => setMode("credentials")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${mode === "credentials" ? "bg-violet-600/30 text-violet-200 shadow-sm" : "text-muted hover:text-default"}`}
        >
          <LogIn className="size-4 inline mr-1.5" />
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode("pin")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${mode === "pin" ? "bg-violet-600/30 text-violet-200 shadow-sm" : "text-muted hover:text-default"}`}
        >
          <KeyRound className="size-4 inline mr-1.5" />
          PIN
        </button>
      </div>

      {mode === "credentials" ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="input-label">Email</label>
            <input name="email" type="email" required className="input-field" placeholder="admin@system.local" />
          </div>
          <div>
            <label className="input-label">Password</label>
            <div className="relative">
              <input name="password" type={showPass ? "text" : "password"} required className="input-field pr-10" placeholder="Enter password" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-default cursor-pointer">
                {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 transition-all shadow-lg shadow-violet-500/15 cursor-pointer">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      ) : (
        <form onSubmit={handlePinLogin} className="space-y-4">
          <div>
            <label className="input-label">Cashier PIN</label>
            <input name="pin" type="password" inputMode="numeric" required className="input-field text-center text-2xl tracking-[0.5em] font-mono" placeholder="****" maxLength={4} autoFocus />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/15 cursor-pointer">
            {loading ? "Signing in..." : "Quick Login"}
          </button>
        </form>
      )}

      {error && (
        <div className="text-xs text-center py-2 rounded-lg bg-rose-500/10 text-rose-400">{error}</div>
      )}

      <p className="text-[10px] text-faint text-center">Default: admin@system.local / admin123</p>
    </div>
  );
}
