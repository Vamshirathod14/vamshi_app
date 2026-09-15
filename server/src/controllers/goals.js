import { z } from "zod";
import { Goal } from "../models/Goal.js";
import { Transaction } from "../models/Transaction.js";
import { Account } from "../models/Account.js";
import { asyncHandler, ApiError } from "../middleware/handle.js";
import { roundMoney, subtractMoney, addMoney } from "../utils/money.js";
import { computeAccountDeltas, applyDeltas } from "../services/finance.js";

const idRef = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

const goalSchema = z.object({
  name: z.string().min(1).max(80),
  emoji: z.string().max(16).default("🎯"),
  color: z.string().max(20).default("#8b5cf6"),
  targetAmount: z.number().positive().max(1_000_000_000),
  currentAmount: z.number().min(0).optional(),
  targetDate: z.union([z.string(), z.date()]).nullable().optional(),
});

const contributionSchema = z.object({
  amount: z.number().positive().max(1_000_000_000),
  date: z.union([z.string(), z.date()]).optional(),
  accountId: idRef.optional().nullable(),
  note: z.string().max(200).optional().default(""),
});

export const list = asyncHandler(async (req, res) => {
  const goals = await Goal.find({ userId: req.user._id }).sort({
    completedAt: 1,
    createdAt: -1,
  });
  const goalsDto = goals.map((g) => ({
    ...g.toObject(),
    percent:
      g.targetAmount > 0
        ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100))
        : 0,
    isCompleted: g.completedAt !== null,
  }));
  return res.json({ goals: goalsDto });
});

export const create = asyncHandler(async (req, res) => {
  const data = goalSchema.parse(req.body);
  const goal = await Goal.create({
    userId: req.user._id,
    ...data,
    currentAmount: data.currentAmount ?? 0,
  });
  return res.status(201).json({ goal });
});

export const update = asyncHandler(async (req, res) => {
  const data = goalSchema.partial().parse(req.body);
  const goal = await Goal.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: data },
    { new: true, runValidators: true },
  );
  if (!goal) throw new ApiError(404, "Goal not found.");
  return res.json({ goal });
});

export const remove = asyncHandler(async (req, res) => {
  const goal = await Goal.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!goal) throw new ApiError(404, "Goal not found.");
  return res.json({ message: "Goal deleted." });
});

export const addContribution = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
  if (!goal) throw new ApiError(404, "Goal not found.");
  const data = contributionSchema.parse(req.body);

  let transaction = null;

  if (data.accountId) {
    const account = await Account.findOne({
      _id: data.accountId,
      userId: req.user._id,
    });
    if (!account) throw new ApiError(404, "Account not found.");

    transaction = await Transaction.create({
      userId: req.user._id,
      type: "savings",
      amount: roundMoney(data.amount),
      accountId: data.accountId,
      goalId: goal._id,
      date: data.date ? new Date(data.date) : new Date(),
      description: `Contribution: ${goal.name}`,
      note: data.note || "",
    });

    await applyDeltas([
      { accountId: data.accountId, delta: -roundMoney(data.amount) },
    ]);
  }

  const contribution = {
    amount: roundMoney(data.amount),
    date: data.date ? new Date(data.date) : new Date(),
    accountId: data.accountId || null,
    transactionId: transaction?._id || null,
    note: data.note || "",
  };

  goal.contributions.push(contribution);
  goal.currentAmount = roundMoney(
    addMoney(goal.currentAmount, contribution.amount),
  );
  if (goal.completedAt === null && goal.currentAmount >= goal.targetAmount) {
    goal.completedAt = new Date();
  }
  await goal.save();
  return res.status(201).json({ goal, contribution });
});

export const removeContribution = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
  if (!goal) throw new ApiError(404, "Goal not found.");
  const idx = Number.parseInt(req.params.contribIdx, 10);
  if (idx < 0 || idx >= goal.contributions.length) {
    throw new ApiError(404, "Contribution not found.");
  }
  const contrib = goal.contributions[idx];

  // reverse linked savings transaction
  if (contrib.transactionId) {
    const tx = await Transaction.findOne({ _id: contrib.transactionId, userId: req.user._id });
    if (tx) {
      await applyDeltas([{ accountId: tx.accountId, delta: tx.amount }]);
      await tx.deleteOne();
    }
  }

  goal.contributions.splice(idx, 1);
  goal.currentAmount = roundMoney(subtractMoney(goal.currentAmount, contrib.amount));
  if (goal.currentAmount < goal.targetAmount) goal.completedAt = null;
  await goal.save();
  return res.json({ goal });
});