import { db } from "./db.js";
import { hashPassword, verifyPassword } from "./crypto.js";
import { checkRateLimit } from "./rate-limit.js";
import { checkPermission, type Permission } from "./permissions.js";

const SESSION_DURATION = 24 * 60 * 60 * 1000;

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function loginWithPin(pin: string, ip: string) {
  if (!checkRateLimit(`pin:${ip}`)) return { error: "Too many attempts. Try again later." };

  const user = await db.prepare("SELECT * FROM users WHERE pin = ? AND active = 1 AND role IN ('admin', 'cashier', 'stock_manager')").get(pin) as {
    id: number; name: string; email: string; role: string; pin: string | null; permissions: string;
  } | undefined;
  if (!user) return { error: "Invalid PIN" };

  const token = generateToken();
  const expires = new Date(Date.now() + SESSION_DURATION).toISOString();
  await db.prepare("INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)").run(user.id, token, expires);

  return { success: true, token, expiresAt: expires, user: { id: user.id, name: user.name, email: user.email, role: user.role, permissions: user.permissions } };
}

export async function loginWithEmail(email: string, password: string, ip: string) {
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

    return { success: true, token, expiresAt: expires, user: { id: user.id, name: user.name, email: user.email, role: user.role, permissions: user.permissions } };
  } catch {
    return { error: "Login failed" };
  }
}

export async function logout(token: string) {
  if (token) {
    await db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  }
  return { success: true };
}

export async function getCurrentUser(token: string | undefined) {
  if (!token) return null;

  const session = await db.prepare(`
    SELECT s.user_id, s.expires_at, u.id, u.name, u.email, u.role, u.permissions
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > datetime('now') AND u.active = 1
  `).get(token) as { user_id: number; expires_at: string; id: number; name: string; email: string; role: string; permissions: string } | undefined;

  if (!session) return null;
  return { id: session.id, name: session.name, email: session.email, role: session.role, permissions: session.permissions };
}

export async function createUser(currentUserToken: string | undefined, data: {
  name: string; email: string; role: string; pin?: string; password: string; permissions?: string;
}) {
  const currentUser = await getCurrentUser(currentUserToken);
  if (!currentUser || currentUser.role !== "admin") return { error: "Unauthorized" };

  const { name, email, role, pin, password, permissions } = data;
  if (!name || !email) return { error: "Name and email are required" };
  if (!password) return { error: "Password is required" };

  const password_hash = hashPassword(password);

  try {
    await db.prepare("INSERT INTO users (name, email, password_hash, role, pin, permissions) VALUES (?, ?, ?, ?, ?, ?)")
      .run(name, email, password_hash, role || "cashier", pin || null, permissions || "[]");
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.includes("UNIQUE")) return { error: "Email already exists" };
    return { error: "Failed to create user" };
  }
  return { success: true };
}

export async function updateUser(currentUserToken: string | undefined, id: number, data: {
  name: string; email: string; role: string; pin?: string; password?: string; active?: number; permissions?: string;
}) {
  const currentUser = await getCurrentUser(currentUserToken);
  if (!currentUser || currentUser.role !== "admin") return { error: "Unauthorized" };

  const { name, email, role, pin, password, active, permissions } = data;
  if (!name || !email) return { error: "Name and email are required" };

  try {
    if (password) {
      const password_hash = hashPassword(password);
      await db.prepare("UPDATE users SET name=?, email=?, role=?, pin=?, active=?, permissions=?, password_hash=?, updated_at=datetime('now') WHERE id=?")
        .run(name, email, role, pin || null, active ?? 1, permissions || "[]", password_hash, id);
    } else {
      await db.prepare("UPDATE users SET name=?, email=?, role=?, pin=?, active=?, permissions=?, updated_at=datetime('now') WHERE id=?")
        .run(name, email, role, pin || null, active ?? 1, permissions || "[]", id);
    }
  } catch {
    return { error: "Failed to update user" };
  }
  return { success: true };
}

export async function deleteUser(currentUserToken: string | undefined, id: number) {
  const currentUser = await getCurrentUser(currentUserToken);
  if (!currentUser || currentUser.role !== "admin") return { error: "Unauthorized" };
  if (id === currentUser.id) return { error: "Cannot delete yourself" };

  await db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
  await db.prepare("DELETE FROM users WHERE id = ?").run(id);
  return { success: true };
}

export async function getUsers(currentUserToken: string | undefined) {
  const currentUser = await getCurrentUser(currentUserToken);
  if (!currentUser || currentUser.role !== "admin") return [];
  return await db.prepare("SELECT id, name, email, role, pin, active, permissions, created_at FROM users ORDER BY created_at DESC").all();
}

export async function requireAuth(token: string | undefined) {
  const user = await getCurrentUser(token);
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireAdmin(token: string | undefined) {
  const user = await requireAuth(token);
  if (user.role !== "admin") throw new Error("Forbidden");
  return user;
}

export async function requirePermission(token: string | undefined, permission: Permission) {
  const user = await getCurrentUser(token);
  if (!user) throw new Error("Unauthorized");
  if (!checkPermission(user, permission)) throw new Error("Forbidden");
  return user;
}
