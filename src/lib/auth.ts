"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { hashPassword, verifyPassword } from "./crypto";
import { checkRateLimit } from "./rate-limit";

import { checkPermission, type Permission } from "./permissions";

const SESSION_DURATION = 24 * 60 * 60 * 1000;

export async function requirePermission(permission: Permission) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!checkPermission(user, permission)) redirect("/");
}

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function loginWithPin(pin: string) {
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "unknown";
  if (!checkRateLimit(`pin:${ip}`)) return { error: "Too many attempts. Try again later." };

  const user = await db.prepare("SELECT * FROM users WHERE pin = ? AND active = 1 AND role IN ('admin', 'cashier', 'stock_manager')").get(pin) as {
    id: number; name: string; email: string; role: string; pin: string | null; permissions: string;
  } | undefined;
  if (!user) return { error: "Invalid PIN" };

  const token = generateToken();
  const expires = new Date(Date.now() + SESSION_DURATION).toISOString();
  await db.prepare("INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)").run(user.id, token, expires);

  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(Date.now() + SESSION_DURATION),
    path: "/",
  });

  return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role, permissions: user.permissions } };
}

export async function loginWithEmail(email: string, password: string) {
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "unknown";
  if (!checkRateLimit(`email:${ip}`)) return { error: "Too many attempts. Try again later." };

  try {
    const user = await db.prepare("SELECT * FROM users WHERE email = ? AND active = 1").get(email) as {
      id: number; name: string; email: string; role: string; pin: string | null; permissions: string; password_hash: string;
    } | undefined;
    if (!user) return { error: "Invalid email or password" };
    if (!verifyPassword(password, user.password_hash)) return { error: "Invalid email or password" };

    const token = generateToken();
    const expires = new Date(Date.now() + SESSION_DURATION).toISOString();
    await db.prepare("INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)").run(user.id, token, expires);

    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(Date.now() + SESSION_DURATION),
      path: "/",
    });

    return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role, permissions: user.permissions } };
  } catch {
    return { error: "Login failed" };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (token) {
    await db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  }
  cookieStore.delete("session");
  return { success: true };
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  const session = await db.prepare(`
    SELECT s.user_id, s.expires_at, u.id, u.name, u.email, u.role, u.permissions
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > datetime('now') AND u.active = 1
  `).get(token) as { user_id: number; expires_at: string; id: number; name: string; email: string; role: string; permissions: string } | undefined;

  if (!session) return null;
  return { id: session.id, name: session.name, email: session.email, role: session.role, permissions: session.permissions };
}

export async function createUser(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;
  const pin = (formData.get("pin") as string) || null;
  const password = (formData.get("password") as string) || null;
  const permissions = (formData.get("permissions") as string) || "[]";

  if (!name || !email) return { error: "Name and email are required" };
  if (!password) return { error: "Password is required" };

  const password_hash = hashPassword(password);

  try {
    await db.prepare("INSERT INTO users (name, email, password_hash, role, pin, permissions) VALUES (?, ?, ?, ?, ?, ?)")
      .run(name, email, password_hash, role || "cashier", pin, permissions);
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.includes("UNIQUE")) return { error: "Email already exists" };
    console.error("createUser error:", msg);
    return { error: "Failed to create user" };
  }
  return { success: true };
}

export async function updateUser(id: number, formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;
  const pin = (formData.get("pin") as string) || null;
  const password = (formData.get("password") as string) || null;
  const active = formData.get("active") === "1" ? 1 : 0;
  const permissions = (formData.get("permissions") as string) || "[]";

  if (!name || !email) return { error: "Name and email are required" };

  try {
    if (password) {
      const password_hash = hashPassword(password);
      await db.prepare("UPDATE users SET name=?, email=?, role=?, pin=?, active=?, permissions=?, password_hash=?, updated_at=datetime('now') WHERE id=?")
        .run(name, email, role, pin, active, permissions, password_hash, id);
    } else {
      await db.prepare("UPDATE users SET name=?, email=?, role=?, pin=?, active=?, permissions=?, updated_at=datetime('now') WHERE id=?")
        .run(name, email, role, pin, active, permissions, id);
    }
  } catch (e: unknown) {
    console.error("updateUser error:", (e as Error).message);
    return { error: "Failed to update user" };
  }
  return { success: true };
}

export async function deleteUser(id: number) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") return { error: "Unauthorized" };
  if (id === currentUser.id) return { error: "Cannot delete yourself" };

  await db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
  await db.prepare("DELETE FROM users WHERE id = ?").run(id);
  return { success: true };
}

export async function getUsers() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") return [];
  return await db.prepare("SELECT id, name, email, role, pin, active, permissions, created_at FROM users ORDER BY created_at DESC").all();
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "admin") throw new Error("Forbidden");
  return user;
}
