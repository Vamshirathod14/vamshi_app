import { z } from "zod";
import { Account } from "../models/Account.js";
import { Transaction } from "../models/Transaction.js";
import { asyncHandler, ApiError } from "../middleware/handle.js";

const accountSchema = z.object({
  name: z.string().min(1).max(60),
  type: z.string().max(30).default("bank"),
  balance: z.number().optional(),
  icon: z.string().max(20).nullable().optional(),
  color: z.string().max(20).default("#6366f1"),
});

export const list = asyncHandler(async (req, res) => {
  const accounts = await Account.find({ userId: req.user._id }).sort({ createdAt: 1 });
  return res.json({ accounts });
});

export const create = asyncHandler(async (req, res) => {
  const data = accountSchema.parse(req.body);
  const count = await Account.countDocuments({ userId: req.user._id });
  const account = await Account.create({
    userId: req.user._id,
    ...data,
    balance: data.balance ?? 0,
    isDefault: count === 0,
  });
  return res.status(201).json({ account });
});

export const update = asyncHandler(async (req, res) => {
  const data = accountSchema.partial().parse(req.body);
  if (data.balance !== undefined && data.balance !== null) {
    throw new ApiError(
      400,
      "You cannot edit the balance directly — record transactions instead.",
    );
  }
  const account = await Account.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: data },
    { new: true, runValidators: true },
  );
  if (!account) throw new ApiError(404, "Account not found.");
  return res.json({ account });
});

export const remove = asyncHandler(async (req, res) => {
  const account = await Account.findOne({ _id: req.params.id, userId: req.user._id });
  if (!account) throw new ApiError(404, "Account not found.");
  const used = await Transaction.exists({
    userId: req.user._id,
    $or: [{ accountId: account._id }, { fromAccountId: account._id }, { toAccountId: account._id }],
  });
  if (used) {
    throw new ApiError(400, "This account has transactions. Move them or delete them first.");
  }
  await account.deleteOne();
  return res.json({ message: "Account deleted." });
});