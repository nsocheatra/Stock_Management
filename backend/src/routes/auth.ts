import { Router, Request, Response } from "express";
import { loginWithPin, loginWithEmail, logout, getCurrentUser, getUsers, createUser, updateUser, deleteUser } from "../auth.js";
import { requireAuth } from "../middleware/auth.js";
import { intParam } from "../utils.js";

const router = Router();

router.post("/login-pin", async (req: Request, res: Response) => {
  const { pin } = req.body;
  if (!pin) { res.status(400).json({ error: "PIN is required" }); return; }
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const result = await loginWithPin(pin, ip);
  if (result.error) { res.status(401).json(result); return; }
  res.json(result);
});

router.post("/login-email", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: "Email and password are required" }); return; }
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const result = await loginWithEmail(email, password, ip);
  if (result.error) { res.status(401).json(result); return; }
  res.json(result);
});

router.post("/logout", requireAuth, async (req: Request, res: Response) => {
  const token = (req as any).token;
  const result = await logout(token);
  res.json(result);
});

router.get("/me", requireAuth, async (req: Request, res: Response) => {
  res.json({ user: (req as any).user });
});

router.get("/users", requireAuth, async (req: Request, res: Response) => {
  const token = (req as any).token;
  const users = await getUsers(token);
  res.json(users);
});

router.post("/users", requireAuth, async (req: Request, res: Response) => {
  const token = (req as any).token;
  const result = await createUser(token, req.body);
  if (result.error) { res.status(400).json(result); return; }
  res.json(result);
});

router.put("/users/:id", requireAuth, async (req: Request, res: Response) => {
  const token = (req as any).token;
  const id = intParam(req, "id");
  const result = await updateUser(token, id, req.body);
  if (result.error) { res.status(400).json(result); return; }
  res.json(result);
});

router.delete("/users/:id", requireAuth, async (req: Request, res: Response) => {
  const token = (req as any).token;
  const id = intParam(req, "id");
  const result = await deleteUser(token, id);
  if (result.error) { res.status(400).json(result); return; }
  res.json(result);
});

export default router;

