import { z } from "zod";
import { RecurringTransaction } from "../models/RecurringTransaction.js";
import { Transaction } from "../models/Transaction.js";
import { Category } from "../models/Category.js";
import { Account } from "../models/Account.js";
import { asyncHandler, ApiError } from "../middleware/handle.js";
import { roundMoney } from "../utils/money.js";
import { computeAccountDeltas, applyDeltas } from "../services/finance.js";
import { startOfDay } from "../utils/date.js";

const recurringSchema = z.object({
  type: z.enum(["expense", "income"]).default("expense"),
  amount: z.number().positive().max(1_000_000_000),
  categoryId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
  accountId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
  paymentMethod: z.string().optional().default("other"),
  source: z.string().max(60).nullable().optional(),
  description: z.string().max(200).optional().default(""),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly", "custom"]).default("monthly"),
  interval: z.number().int().min(1).max(365).optional().default(1),
  customDaysOfWeek: z.array(z.number().int().min(0).max(6)).optional().default([]),
  customDayOfMonth: z.number().int().min(1).max(31).nullable().optional().default(null),
  startDate: z.union([z.string(), z.date()]),
  endDate: z.union([z.string(), z.date()]).nullable().optional(),
  active: z.boolean().optional().default(true),
});

export function computeNextDate(r, from = new Date()) {
  const base = new Date(from);
  let next = new Date(base);
  // preserve the day-of-month the plan started on for monthly/yearly cadence
  const anchorDay = base.getDate();

  switch (r.frequency) {
    case "daily":
      next.setDate(next.getDate() + r.interval);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7 * r.interval);
      break;
    case "monthly": {
      const y = next.getFullYear();
      const m = next.getMonth() + r.interval;
      const first = new Date(y, m, 1);
      next = new Date(y, m, Math.min(anchorDay, daysInMonth(first)));
      break;
    }
    case "yearly": {
      const y = next.getFullYear() + r.interval;
      const first = new Date(y, next.getMonth(), 1);
      next = new Date(y, next.getMonth(), Math.min(anchorDay, daysInMonth(first)));
      break;
    }
    case "custom":
      if (r.customDayOfMonth) {
        const nextMonth = new Date(
          next.getFullYear(),
          next.getMonth() + r.interval,
          Math.min(r.customDayOfMonth, 28),
        );
        let target = nextMonth;
        if (target <= base) {
          target = new Date(
            nextMonth.getFullYear(),
            nextMonth.getMonth() + r.interval,
            Math.min(r.customDayOfMonth, 28),
          );
        }
        next = target;
      } else if (r.customDaysOfWeek?.length) {
        next = new Date(base);
        next.setDate(next.getDate() + 1);
        for (let i = 0; i < 14; i++) {
          if (r.customDaysOfWeek.includes(next.getDay())) break;
          next.setDate(next.getDate() + 1);
        }
      } else {
        next.setDate(next.getDate() + r.interval);
      }
      break;
    default:
      next.setDate(next.getDate() + r.interval);
  }

  return startOfDay(next);
}

function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export const list = asyncHandler(async (req, res) => {
  const recurring = await RecurringTransaction.find({ userId: req.user._id }).sort({
    nextRunDate: 1,
  });
  const categoryIds = recurring
    .map((r) => r.categoryId)
    .filter((id) => id && id.toString() !== "null");
  const accountIds = recurring
    .map((r) => r.accountId)
    .filter((id) => id && id.toString() !== "null");
  const [categories, accounts] = await Promise.all([
    Category.find({ _id: { $in: categoryIds } }).select("name emoji color type"),
    Account.find({ _id: { $in: accountIds } }).select("name color icon"),
  ]);
  const catMap = new Map(categories.map((c) => [c._id.toString(), c]));
  const accMap = new Map(accounts.map((a) => [a._id.toString(), a]));

  const items = recurring.map((r) => ({
    ...r.toObject(),
    category: r.categoryId ? catMap.get(r.categoryId.toString()) || null : null,
    account: r.accountId ? accMap.get(r.accountId.toString()) || null : null,
  }));
  return res.json({ recurring: items });
});

export const create = asyncHandler(async (req, res) => {
  const data = recurringSchema.parse(req.body);
  const record = await RecurringTransaction.create({
    userId: req.user._id,
    ...data,
    amount: roundMoney(data.amount),
    nextRunDate: computeNextDate({ frequency: data.frequency, interval: data.interval, customDaysOfWeek: data.customDaysOfWeek, customDayOfMonth: data.customDayOfMonth }, data.startDate),
  });
  return res.status(201).json({ recurring: record });
});

export const update = asyncHandler(async (req, res) => {
  const data = recurringSchema.partial().parse(req.body);
  const existing = await RecurringTransaction.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!existing) throw new ApiError(404, "Recurring transaction not found.");
  Object.assign(existing, data);
  if (data.amount !== undefined) existing.amount = roundMoney(data.amount);
  if (data.frequency || data.interval || data.customDaysOfWeek || data.customDayOfMonth) {
    existing.nextRunDate = computeNextDate(existing, data.startDate ?? existing.startDate);
  }
  await existing.save();
  return res.json({ recurring: existing });
});

export const remove = asyncHandler(async (req, res) => {
  const rec = await RecurringTransaction.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!rec) throw new ApiError(404, "Recurring transaction not found.");
  return res.json({ message: "Recurring transaction deleted." });
});

export const upcoming = asyncHandler(async (req, res) => {
  const records = await RecurringTransaction.find({
    userId: req.user._id,
    active: true,
    nextRunDate: { $ne: null },
  }).sort({ nextRunDate: 1 });

  const categoryIds = records
    .map((r) => r.categoryId)
    .filter((id) => id && id.toString() !== "null");
  const accountIds = records
    .map((r) => r.accountId)
    .filter((id) => id && id.toString() !== "null");
  const [categories, accounts] = await Promise.all([
    Category.find({ _id: { $in: categoryIds } }).select("name emoji color type"),
    Account.find({ _id: { $in: accountIds } }).select("name color icon"),
  ]);
  const catMap = new Map(categories.map((c) => [c._id.toString(), c]));
  const accMap = new Map(accounts.map((a) => [a._id.toString(), a]));

  const upcoming = records.map((r) => ({
    id: r._id,
    type: r.type,
    amount: r.amount,
    description: r.description,
    nextRunDate: r.nextRunDate,
    frequency: r.frequency,
    category: r.categoryId ? catMap.get(r.categoryId.toString()) || null : null,
    account: r.accountId ? accMap.get(r.accountId.toString()) || null : null,
  }));
  return res.json({ upcoming });
});

/**
 * Seed engine: generate transactions that are due, mark the next run date.
 * Called by a scheduler (setInterval + on boot).
 */
export async function runRecurringEngine(userId = null) {
  const now = startOfDay(new Date());
  const filter = {
    active: true,
    nextRunDate: { $lte: now },
    $or: [{ endDate: null }, { endDate: { $gte: now } }],
  };
  if (userId) filter.userId = userId;
  const due = await RecurringTransaction.find(filter);

  let count = 0;
  for (const r of due) {
    const tx = await Transaction.create({
      userId: r.userId,
      type: r.type,
      amount: r.amount,
      categoryId: r.categoryId,
      accountId: r.accountId,
      paymentMethod: r.paymentMethod,
      source: r.source,
      description: r.description || (r.type === "income" ? "Recurring income" : "Recurring expense"),
      date: r.nextRunDate,
      recurringId: r._id,
    });

    const deltas = computeAccountDeltas({
      type: r.type,
      accountId: r.accountId,
      amount: r.amount,
    });
    await applyDeltas(deltas);

    r.lastGeneratedDate = r.nextRunDate;
    const next = computeNextDate(r, r.nextRunDate);
    if (r.endDate && next > r.endDate) {
      r.active = false;
      r.nextRunDate = null;
    } else {
      r.nextRunDate = next;
    }
    await r.save();
    count++;
  }
  return count;
}