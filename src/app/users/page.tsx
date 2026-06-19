import { getUsers, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { T } from "@/components/T";
import { Shield, User as UserIcon, KeyRound } from "lucide-react";
import UserForm from "./UserForm";
import DeleteButton from "./DeleteButton";

const roleColors: Record<string, string> = {
  admin: "bg-violet-500/15 text-violet-400",
  cashier: "bg-emerald-500/15 text-emerald-400",
  stock_manager: "bg-amber-500/15 text-amber-400",
};

const roleGradients: Record<string, string> = {
  admin: "bg-gradient-to-tr from-violet-500 to-indigo-500 text-white",
  cashier: "bg-gradient-to-tr from-emerald-500 to-teal-500 text-white",
  stock_manager: "bg-gradient-to-tr from-amber-500 to-orange-500 text-white",
};

export default async function UsersPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") redirect("/");

  const users = await getUsers() as Array<{ id: number; name: string; email: string; role: string; pin: string | null; active: number; permissions: string; created_at: string }>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
          <T k="users.title" />
        </h1>
        <p className="text-sm text-faint mt-1"><T k="users.subtitle" /></p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add User */}
        <div>
          <div className="bg-surface-blur border-surface rounded-2xl p-5 shadow-xl">
            <h2 className="text-sm font-semibold text-default flex items-center gap-2 mb-4">
              <UserIcon className="size-4 text-muted" />
              <T k="users.addUser" />
            </h2>
            <UserForm />
          </div>
        </div>

        {/* Users List */}
        <div className="lg:col-span-2">
          <div className="bg-surface-blur border-surface rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-surface flex items-center justify-between">
              <h2 className="text-sm font-semibold text-default flex items-center gap-2">
                <Shield className="size-4 text-muted" />
                <T k="users.allUsers" />
              </h2>
              <span className="text-xs text-faint"><T k="users.usersCount" vars={{ count: users.length }} /></span>
            </div>

            {users.length > 0 ? (
              <div className="divide-y divide-surface">
                {users.map((u) => {
                  let perms: string[] = [];
                  try { perms = JSON.parse(u.permissions || "[]"); } catch { perms = []; }
                  return (
                    <div key={u.id} className="p-4 hover-surface transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`size-9 rounded-lg flex items-center justify-center text-xs font-bold shadow-md shrink-0 ${roleGradients[u.role] || roleGradients.cashier}`}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-default truncate">{u.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${roleColors[u.role] || roleColors.cashier}`}>{u.role.replace("_", " ")}</span>
                              {!u.active && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-bold uppercase"><T k="users.roles.inactive" /></span>}
                            </div>
                            <p className="text-xs text-muted">{u.email}</p>
                            {u.pin && (
                              <p className="text-[10px] text-faint flex items-center gap-1 mt-0.5">
                                <KeyRound className="size-3" />
                                <T k="users.pinLabel" vars={{ pin: u.pin }} />
                              </p>
                            )}
                            {/* Permissions summary */}
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {perms.slice(0, 4).map((p) => (
                                <span key={p} className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-main)] text-muted truncate max-w-[120px]">
                                  {PERMISSIONS[p as keyof typeof PERMISSIONS] || p}
                                </span>
                              ))}
                              {perms.length > 4 && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded text-faint">+{perms.length - 4}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {u.id !== currentUser.id && (
                          <DeleteButton userId={u.id} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-faint">
                <Shield className="size-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm"><T k="users.noUsers" /></p>
              </div>
            )}
          </div>

          <p className="text-[10px] text-faint mt-2 text-center"><T k="users.defaultHint" /></p>
        </div>
      </div>
    </div>
  );
}
