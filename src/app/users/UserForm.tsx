"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createUser } from "@/lib/auth";
import { PERMISSIONS, ROLE_PERMISSIONS, type Permission } from "@/lib/permissions";
import { useTranslation } from "@/i18n/useTranslation";

const allPermissions = Object.entries(PERMISSIONS) as [Permission, string][];

export default function UserForm() {
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState("cashier");
  const [selectedPerms, setSelectedPerms] = useState<Permission[]>(ROLE_PERMISSIONS.cashier);
  const router = useRouter();
  const { t } = useTranslation();

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    setSelectedPerms(ROLE_PERMISSIONS[role] ?? []);
  };

  const togglePerm = (perm: Permission) => {
    if (selectedRole === "admin") return;
    setSelectedPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("permissions", JSON.stringify(selectedPerms));
    const result = await createUser(fd);
    if (result.success) {
      router.refresh();
      (e.target as HTMLFormElement).reset();
      setSelectedRole("cashier");
      setSelectedPerms(ROLE_PERMISSIONS.cashier);
    } else {
      setError(result.error || t("users.failed"));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="input-label">{t("users.fields.name")}</label>
        <input name="name" required className="input-field" placeholder={t("users.placeholders.name")} />
      </div>
      <div>
        <label className="input-label">{t("users.fields.email")}</label>
        <input name="email" type="email" required className="input-field" placeholder={t("users.placeholders.email")} />
      </div>
      <div>
        <label className="input-label">{t("users.fields.role")}</label>
        <select name="role" value={selectedRole} onChange={(e) => handleRoleChange(e.target.value)} className="input-field">
          <option value="cashier">{t("users.rolesDropdown.cashier")}</option>
          <option value="stock_manager">Stock Manager</option>
          <option value="admin">{t("users.rolesDropdown.admin")}</option>
        </select>
      </div>
      <div>
        <label className="input-label">{t("users.fields.pin")}</label>
        <input name="pin" className="input-field" placeholder={t("users.placeholders.pin")} pattern="[0-9]{6}" maxLength={6} />
      </div>

      {/* Permissions */}
      <div>
        <label className="input-label">Permissions</label>
        <div className="space-y-1 max-h-48 overflow-y-auto border border-[var(--border-color)] rounded-xl p-2">
          {allPermissions.map(([key, label]) => {
            const enabled = selectedRole === "admin" || selectedPerms.includes(key);
            return (
              <label
                key={key}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                  selectedRole === "admin" ? "opacity-60" : "hover-surface"
                }`}
              >
                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={selectedRole === "admin"}
                  onChange={() => togglePerm(key)}
                  className="accent-violet-500 size-3.5"
                />
                <span className="text-default">{label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <input type="hidden" name="permissions" value={JSON.stringify(selectedPerms)} />

      <button type="submit" className="w-full py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/15 flex items-center justify-center gap-2 cursor-pointer">
        <Plus className="size-4" />
        {t("users.add")}
      </button>
      {error && <div className="text-xs text-center py-2 rounded-lg bg-rose-500/10 text-rose-400">{error}</div>}
    </form>
  );
}
