import fs from "node:fs/promises";
import path from "node:path";
import { Receipt } from "../models/Receipt.js";
import { Transaction } from "../models/Transaction.js";
import { asyncHandler, ApiError } from "../middleware/handle.js";
import { env } from "../config/env.js";

export const uploadDir = path.resolve(process.cwd(), "uploads");

const MIME_ALLOW = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

export async function ensureUploadDir() {
  await fs.mkdir(uploadDir, { recursive: true });
}

export const upload = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "No file received.");
  if (!MIME_ALLOW.has(req.file.mimetype)) {
    await fs.unlink(req.file.path).catch(() => {});
    throw new ApiError(400, "Only image or PDF receipts are supported.");
  }
  const receipt = await Receipt.create({
    userId: req.user._id,
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    storagePath: `uploads/${req.file.filename}`,
  });
  return res.status(201).json({ receipt });
});

export const attach = asyncHandler(async (req, res) => {
  const { transactionId } = req.body;
  const receipt = await Receipt.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!receipt) throw new ApiError(404, "Receipt not found.");
  const tx = await Transaction.findOneAndUpdate(
    { _id: transactionId, userId: req.user._id },
    { $set: { receiptId: receipt._id } },
    { new: true },
  );
  if (!tx) throw new ApiError(404, "Transaction not found.");
  return res.json({ receipt, transaction: tx });
});

export const download = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!receipt) throw new ApiError(404, "Receipt not found.");
  const abs = path.resolve(process.cwd(), receipt.storagePath);
  return res.sendFile(abs);
});

export const remove = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!receipt) throw new ApiError(404, "Receipt not found.");
  await Transaction.updateMany(
    { receiptId: receipt._id },
    { $set: { receiptId: null } },
  );
  await fs.unlink(path.resolve(process.cwd(), receipt.storagePath)).catch(() => {});
  await receipt.deleteOne();
  return res.json({ message: "Receipt deleted." });
});