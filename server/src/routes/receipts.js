import { Router } from "express";
import multer from "multer";
import { upload, attach, download, remove, ensureUploadDir } from "../controllers/receipts.js";
import { protect } from "../middleware/auth.js";
import { env } from "../config/env.js";
import { uploadLimiter } from "../middleware/rateLimit.js";

await ensureUploadDir();

const ALLOW_EXT = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".pdf"];
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads"),
  filename: (_req, file, cb) => {
    const ext = ALLOW_EXT.includes(file.originalname.toLowerCase().split(".").pop())
      ? "." + file.originalname.toLowerCase().split(".").pop()
      : "";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const uploadMiddleware = multer({
  storage,
  limits: { fileSize: env.maxReceiptSizeMb * 1024 * 1024 },
});

const router = Router();
router.use(protect);
router.post("/", uploadLimiter, uploadMiddleware.single("receipt"), upload);
router.post("/:id/attach", attach);
router.get("/:id/download", download);
router.delete("/:id", remove);
export default router;