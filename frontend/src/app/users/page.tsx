import { getUsers, getCurrentUser } from "@/server/auth";
import { redirect } from "next/navigation";
import { T } from "@/components/T";
import { User as UserIcon } from "lucide-react";
import UserForm from "./UserForm";
import UsersList from "./UsersList";

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
          <UsersList users={users} currentUserId={currentUser.id} />
        </div>
      </div>
    </div>
  );
}
