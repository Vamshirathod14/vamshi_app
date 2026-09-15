import { z } from "zod";
import { Budget } from "../models/Budget.js";
import { Category } from "../models/Category.js";
import { Transaction } from "../models/Transaction.js";
import { asyncHandler, ApiError } from "../middleware/handle.js";
import { roundMoney } from "../utils/money.js";
import { monthKey, monthBounds } from "../utils/date.js";

const budgetSchema = z.object({
  categoryId: z.string().regex(/^[a-f\d]{24}$/i),
  limit: z.number().positive().max(1_000_000_000),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export const listBudgets = asyncHandler(async (req, res) => {
  const current = monthKey();
  const budgetsRaw = await Budget.find({ userId: req.user._id }).sort({ month: -1 });

  const categoryIds = budgetsRaw.map((b) => b.categoryId);
  const categories = await Category.find({ _id: { $in: categoryIds } }).select(
    "name emoji color type",
  );
  const catMap = new Map(categories.map((c) => [c._id.toString(), c]));

  // spending per budget (its own month)
  const monthSpend = await Transaction.aggregate([
    {
      $match: {
        userId: req.user._id,
        type: "expense",
        categoryId: { $in: categoryIds },
      },
    },
    {
      $group: {
        _id: { c: "$categoryId", y: { $year: "$date" }, m: { $month: "$date" } },
        spent: { $sum: "$amount" },
      },
    },
  ]);

  const key = (c, y, m) => `${c}:${y}-${String(m).padStart(2, "0")}`;
  const spendMap = new Map(
    monthSpend.map((s) => [key(s._id.c.toString(), s._id.y, s._id.m), s.spent]),
  );

  const budgets = budgetsRaw.map((b) => {
    const [y, m] = b.month.split("-").map(Number);
    const cat = catMap.get(b.categoryId.toString());
    const spent = spendMap.get(key(b.categoryId.toString(), y, m)) ?? 0;
    const limit = roundMoney(b.limit);
    const spentR = roundMoney(spent);
    return {
      id: b._id,
      categoryId: b.categoryId,
      category: cat ? { id: cat._id, name: cat.name, emoji: cat.emoji, color: cat.color } : null,
      month: b.month,
      limit,
      spent: spentR,
      remaining: roundMoney(limit - spentR),
      percent: limit > 0 ? Math.min(100, Math.round((spentR / limit) * 100)) : 0,
      isCurrent: b.month === current,
    };
  });

  return res.json({ budgets });
});

export const createBudget = asyncHandler(async (req, res) => {
  const data = budgetSchema.parse(req.body);
  const cat = await Category.findOne({ _id: data.categoryId, userId: req.user._id });
  if (!cat) throw new ApiError(404, "Category not found.");
  const existing = await Budget.findOne({
    userId: req.user._id,
    month: data.month,
    categoryId: data.categoryId,
  });
  if (existing) {
    existing.limit = data.limit;
    await existing.save();
    return res.json({ budget: existing });
  }
  const budget = await Budget.create({ userId: req.user._id, ...data });
  return res.status(201).json({ budget });
});

export const updateBudget = asyncHandler(async (req, res) => {
  const data = z
    .object({ limit: z.number().positive().max(1_000_000_000) })
    .parse(req.body);
  const budget = await Budget.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { ...data, notified80: false, notified100: false } },
    { new: true, runValidators: true },
  );
  if (!budget) throw new ApiError(404, "Budget not found.");
  return res.json({ budget });
});

export const deleteBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!budget) throw new ApiError(404, "Budget not found.");
  return res.json({ message: "Budget deleted." });
});