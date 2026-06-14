"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Eye, EyeOff } from "lucide-react";
import { createUser } from "@/lib/auth";

export default function UserForm() {
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const result = await createUser(fd);
    if (result.success) {
      router.refresh();
      (e.target as HTMLFormElement).reset();
    } else {
      setError(result.error || "Failed to create user");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="input-label">Name</label>
        <input name="name" required className="input-field" placeholder="Full name" />
      </div>
      <div>
        <label className="input-label">Email</label>
        <input name="email" type="email" required className="input-field" placeholder="email@example.com" />
      </div>
      <div>
        <label className="input-label">Password</label>
        <div className="relative">
          <input name="password" type={showPass ? "text" : "password"} required className="input-field pr-10" placeholder="Min 6 characters" minLength={6} />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-default cursor-pointer">
            {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className="input-label">Role</label>
        <select name="role" className="input-field">
          <option value="cashier">Cashier</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div>
        <label className="input-label">PIN (for quick login)</label>
        <input name="pin" className="input-field" placeholder="4-digit PIN" pattern="[0-9]{4}" maxLength={4} />
      </div>
      <button type="submit" className="w-full py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/15 flex items-center justify-center gap-2 cursor-pointer">
        <Plus className="size-4" />
        Add User
      </button>
      {error && <div className="text-xs text-center py-2 rounded-lg bg-rose-500/10 text-rose-400">{error}</div>}
    </form>
  );
}
