import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { requireAuth } from "../middleware/auth.js";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, "..", "..", "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

router.post("/", requireAuth, upload.single("file"), (req: Request, res: Response) => {
  if (!req.file) { res.status(400).json({ error: "No file" }); return; }
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

export default router;

