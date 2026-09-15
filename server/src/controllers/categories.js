import { z } from "zod";
import { Category } from "../models/Category.js";
import { Transaction } from "../models/Transaction.js";
import { asyncHandler, ApiError } from "../middleware/handle.js";

const categorySchema = z.object({
  name: z.string().min(1).max(60),
  emoji: z.string().max(16).default("📦"),
  color: z.string().max(20).default("#64748b"),
  type: z.enum(["expense", "income"]).default("expense"),
});

export const list = asyncHandler(async (req, res) => {
  const type = req.query.type || undefined;
  const filter = { userId: req.user._id };
  if (type === "expense" || type === "income") filter.type = type;
  const categories = await Category.find(filter).sort({ type: 1, sortOrder: 1, name: 1 });
  return res.json({ categories });
});

export const create = asyncHandler(async (req, res) => {
  const data = categorySchema.parse(req.body);
  const maxOrder = await Category.findOne({ userId: req.user._id, type: data.type }).sort(
    "-sortOrder",
  );
  const category = await Category.create({
    userId: req.user._id,
    ...data,
    sortOrder: (maxOrder?.sortOrder ?? 0) + 1,
  });
  return res.status(201).json({ category });
});

export const update = asyncHandler(async (req, res) => {
  const data = categorySchema.partial().parse(req.body);
  const category = await Category.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { ...data, isDefault: false } },
    { new: true, runValidators: true },
  );
  if (!category) throw new ApiError(404, "Category not found.");
  return res.json({ category });
});

export const remove = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ _id: req.params.id, userId: req.user._id });
  if (!category) throw new ApiError(404, "Category not found.");
  const used = await Transaction.exists({ userId: req.user._id, categoryId: category._id });
  if (used) {
    throw new ApiError(400, "This category is used by some transactions.");
  }
  await category.deleteOne();
  return res.json({ message: "Category deleted." });
});