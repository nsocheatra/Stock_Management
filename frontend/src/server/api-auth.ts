import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "./db";
import { checkPermission, type Permission } from "./permissions";

export async function getApiUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  const session = await db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.permissions
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > datetime('now') AND u.active = 1
  `).get(token) as { id: number; name: string; email: string; role: string; permissions: string } | undefined;

  if (!session) return null;
  return { id: session.id, name: session.name, email: session.email, role: session.role, permissions: session.permissions };
}

export async function requireApiAuth() {
  const user = await getApiUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null as never };
  }
  return { error: null, user };
}

export async function requireApiPermission(permission: Permission) {
  const { error, user } = await requireApiAuth();
  if (error) return { error, user: null as never };
  if (!checkPermission(user, permission)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), user: null as never };
  }
  return { error: null, user };
}
