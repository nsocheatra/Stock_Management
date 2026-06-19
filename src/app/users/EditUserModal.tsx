"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Pencil } from "lucide-react";
import { updateUser } from "@/lib/auth";
import { PERMISSIONS, ROLE_PERMISSIONS, type Permission } from "@/lib/permissions";
import { useTranslation } from "@/i18n/useTranslation";

const allPermissions = Object.entries(PERMISSIONS) as [Permission, string][];

export default function EditUserModal({ user, onClose }: {
  user: { id: number; name: string; email: string; role: string; pin: string | null; active: number; permissions: string };
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState(user.role);
  let initialPerms: Permission[] = [];
  try { initialPerms = JSON.parse(user.permissions || "[]"); } catch { initialPerms = []; }
  const [selectedPerms, setSelectedPerms] = useState<Permission[]>(
    user.role === "admin" ? (ROLE_PERMISSIONS.admin ?? []) : initialPerms
  );
  const router = useRouter();
  const { t } = useTranslation();

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    if (role === "admin") {
      setSelectedPerms(ROLE_PERMISSIONS.admin ?? []);
    } else {
      setSelectedPerms(ROLE_PERMISSIONS[role] ?? []);
    }
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
    const result = await updateUser(user.id, fd);
    if (result.success) {
      router.refresh();
      onClose();
    } else {
      setError(result.error || t("users.failed"));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-blur border-surface rounded-2xl p-6 w-full max-w-md shadow-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-default flex items-center gap-2">
            <Pencil className="size-4 text-muted" />
            {t("users.editUser")}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover-surface text-muted cursor-pointer">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="input-label">{t("users.fields.name")}</label>
            <input name="name" defaultValue={user.name} required className="input-field" />
          </div>
          <div>
            <label className="input-label">{t("users.fields.email")}</label>
            <input name="email" type="email" defaultValue={user.email} required className="input-field" />
          </div>
          <div>
            <label className="input-label">{t("users.fields.role")}</label>
        <select name="role" value={selectedRole} onChange={(e) => handleRoleChange(e.target.value)} className="input-field">
          <option value="cashier">{t("users.rolesDropdown.cashier")}</option>
          <option value="stock_manager">{t("users.rolesDropdown.stock_manager")}</option>
          <option value="admin">{t("users.rolesDropdown.admin")}</option>
        </select>
          </div>
          <div>
            <label className="input-label">{t("users.fields.pin")}</label>
            <input name="pin" defaultValue={user.pin || ""} className="input-field" placeholder={t("users.placeholders.pin")} pattern="[0-9]{6}" maxLength={6} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="hidden" name="active" value={user.active ? "0" : "1"} />
            <input
              type="checkbox"
              defaultChecked={!!user.active}
              onChange={(e) => {
                const hidden = e.currentTarget.previousElementSibling as HTMLInputElement;
                hidden.value = e.currentTarget.checked ? "1" : "0";
              }}
              className="sr-only peer"
            />
            <div className="w-9 h-5 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 bg-zinc-700 relative" />
            <span className="text-sm text-default">{t("users.active")}</span>
          </label>

          <div>
            <label className="input-label">Permissions</label>
            <div className="space-y-1 max-h-48 overflow-y-auto border border-surface rounded-xl p-2">
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
            <Pencil className="size-4" />
            {t("users.save")}
          </button>
          {error && <div className="text-xs text-center py-2 rounded-lg bg-rose-500/10 text-rose-400">{error}</div>}
        </form>
      </div>
    </div>
  );
}
