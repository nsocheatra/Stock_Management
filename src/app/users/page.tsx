import { getUsers } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Shield, User as UserIcon, KeyRound } from "lucide-react";
import UserForm from "./UserForm";
import DeleteButton from "./DeleteButton";

export default async function UsersPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") redirect("/");

  const users = await getUsers();

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
          User Management
        </h1>
        <p className="text-sm text-faint mt-1">Manage cashiers and administrators.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add User */}
        <div>
          <div className="bg-surface-blur border-surface rounded-2xl p-5 shadow-xl">
            <h2 className="text-sm font-semibold text-default flex items-center gap-2 mb-4">
              <UserIcon className="size-4 text-muted" />
              Add User
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
                All Users
              </h2>
              <span className="text-xs text-faint">{users.length} users</span>
            </div>

            {users.length > 0 ? (
              <div className="divide-y divide-surface">
                {users.map((u: any) => (
                  <div key={u.id} className="p-4 hover-surface transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`size-9 rounded-lg flex items-center justify-center text-xs font-bold shadow-md ${
                          u.role === "admin" ? "bg-gradient-to-tr from-violet-500 to-indigo-500 text-white" : "bg-gradient-to-tr from-emerald-500 to-teal-500 text-white"
                        }`}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-default">{u.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                              u.role === "admin" ? "bg-violet-500/15 text-violet-400" : "bg-emerald-500/15 text-emerald-400"
                            }`}>{u.role}</span>
                            {!u.active && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-bold uppercase">Inactive</span>}
                          </div>
                          <p className="text-xs text-muted">{u.email}</p>
                          {u.pin && (
                            <p className="text-[10px] text-faint flex items-center gap-1 mt-0.5">
                              <KeyRound className="size-3" />
                              PIN: {u.pin}
                            </p>
                          )}
                        </div>
                      </div>
                      {u.id !== currentUser.id && (
                        <DeleteButton userId={u.id} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-faint">
                <Shield className="size-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No users yet</p>
              </div>
            )}
          </div>

          <p className="text-[10px] text-faint mt-2 text-center">Default admin: admin@system.local / admin123</p>
        </div>
      </div>
    </div>
  );
}
