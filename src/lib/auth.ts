"use server";

import { cookies } from "next/headers";
import { db } from "./db";
import bcrypt from "bcryptjs";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

if (!getApps().length) {
  initializeApp({ projectId: "riksystem" });
}

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24h

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function login(email: string, password: string) {
  const user = await db.prepare("SELECT * FROM users WHERE email = ? AND active = 1").get(email) as {
    id: number; name: string; email: string; password_hash: string; role: string; pin: string | null;
  } | undefined;
  if (!user) return { error: "Invalid credentials" };
  if (!bcrypt.compareSync(password, user.password_hash)) return { error: "Invalid credentials" };

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

  return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

export async function loginWithPin(pin: string) {
  const user = await db.prepare("SELECT * FROM users WHERE pin = ? AND active = 1 AND role = 'cashier'").get(pin) as {
    id: number; name: string; email: string; password_hash: string; role: string; pin: string | null;
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

  return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

export async function loginWithGoogle(idToken: string) {
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    const email = decoded.email;
    if (!email) return { error: "Google account has no email" };

    const user = await db.prepare("SELECT * FROM users WHERE email = ? AND active = 1").get(email) as {
      id: number; name: string; email: string; password_hash: string; role: string; pin: string | null;
    } | undefined;
    if (!user) return { error: "No account found with this email" };
    if (user.role !== "admin") return { error: "Only admins can sign in with Google" };

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

    return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
  } catch {
    return { error: "Google sign-in failed" };
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
    SELECT s.user_id, s.expires_at, u.id, u.name, u.email, u.role
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > datetime('now') AND u.active = 1
  `).get(token) as { user_id: number; expires_at: string; id: number; name: string; email: string; role: string } | undefined;

  if (!session) return null;
  return { id: session.id, name: session.name, email: session.email, role: session.role };
}

export async function createUser(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;
  const pin = (formData.get("pin") as string) || null;

  if (!name || !email || !password) return { error: "Name, email, and password are required" };

  const hash = bcrypt.hashSync(password, 10);
  try {
    await db.prepare("INSERT INTO users (name, email, password_hash, role, pin) VALUES (?, ?, ?, ?, ?)").run(name, email, hash, role || "cashier", pin);
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.includes("UNIQUE")) return { error: "Email already exists" };
    return { error: msg };
  }
  return { success: true };
}

export async function updateUser(id: number, formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;
  const pin = (formData.get("pin") as string) || null;
  const active = formData.get("active") === "1" ? 1 : 0;

  if (!name || !email) return { error: "Name and email are required" };

  try {
    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      await db.prepare("UPDATE users SET name=?, email=?, password_hash=?, role=?, pin=?, active=?, updated_at=datetime('now') WHERE id=?").run(name, email, hash, role, pin, active, id);
    } else {
      await db.prepare("UPDATE users SET name=?, email=?, role=?, pin=?, active=?, updated_at=datetime('now') WHERE id=?").run(name, email, role, pin, active, id);
    }
  } catch (e: unknown) {
    return { error: (e as Error).message };
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
  return await db.prepare("SELECT id, name, email, role, pin, active, created_at FROM users ORDER BY created_at DESC").all();
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
