import { Request, Response, NextFunction } from "express";
import { getCurrentUser } from "../auth.js";
import { checkPermission, type Permission } from "../permissions.js";

export async function getUser(req: Request) {
  const token = extractToken(req);
  if (!token) return null;
  return await getCurrentUser(token);
}

function extractToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  const cookie = req.headers.cookie;
  if (cookie) {
    const match = cookie.match(/session=([^;]+)/);
    if (match) return match[1];
  }
  return undefined;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    const user = await getCurrentUser(token);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    (req as any).user = user;
    (req as any).token = token;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

export function requirePermission(permission: Permission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!checkPermission(user, permission)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

export async function optionalUser(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  const user = await getCurrentUser(token);
  (req as any).user = user;
  (req as any).token = token;
  next();
}
