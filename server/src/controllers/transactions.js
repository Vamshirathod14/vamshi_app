import { z } from "zod";
import { Transaction, PAYMENT_METHODS } from "../models/Transaction.js";
import { Account } from "../models/Account.js";
import { asyncHandler, ApiError } from "../middleware/handle.js";
import { computeAccountDeltas, applyDeltas } from "../services/finance.js";
import { roundMoney, addMoney, subtractMoney } from "../utils/money.js";
import { toDateOnly, combineDateTime, endOfDay } from "../utils/date.js";

const idRef = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

const expenseSchema = z.object({
  type: z.literal("expense"),
  amount: z.number().positive().max(100_000_000),
  categoryId: idRef.optional().nullable(),
  accountId: idRef.optional().nullable(),
  paymentMethod: z.enum(PAYMENT_METHODS).default("other"),
  description: z.string().max(200).optional().default(""),
  note: z.string().max(1000).optional().default(""),
  date: z.union([z.string(), z.date()]).default(() => new Date()),
  time: z.string().nullable().optional(),
  receiptId: idRef.optional().nullable(),
});

const incomeSchema = z.object({
  type: z.literal("income"),
  amount: z.number().positive().max(100_000_000),
  source: z.string().max(60).optional().default("Other"),
  accountId: idRef.optional().nullable(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  description: z.string().max(200).optional().default(""),
  note: z.string().max(1000).optional().default(""),
  date: z.union([z.string(), z.date()]).default(() => new Date()),
  time: z.string().nullable().optional(),
});

const transferSchema = z.object({
  type: z.literal("transfer"),
  amount: z.number().positive().max(100_000_000),
  fromAccountId: idRef,
  toAccountId: idRef,
  description: z.string().max(200).optional().default(""),
  date: z.union([z.string(), z.date()]).default(() => new Date()),
  time: z.string().nullable().optional(),
});

const createSchema = z.discriminatedUnion("type", [
  expenseSchema,
  incomeSchema,
  transferSchema,
]);

const updateSchema = z.object({
  amount: z.number().positive().max(100_000_000).optional(),
  categoryId: idRef.optional().nullable(),
  accountId: idRef.optional().nullable(),
  fromAccountId: idRef.optional().nullable(),
  toAccountId: idRef.optional().nullable(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  source: z.string().max(60).optional().nullable(),
  description: z.string().max(200).optional(),
  note: z.string().max(1000).optional(),
  date: z.union([z.string(), z.date()]).optional(),
  time: z.string().nullable().optional(),
});

async function buildDateValue(schemaDate, schemaTime) {
  const base = schemaDate ? toDateOnly(new Date(schemaDate)) : toDateOnly();
  return combineDateTime(base, schemaTime || undefined);
}

function effectiveDateOnly(date) {
  const d = toDateOnly(date);
  return { date: d, dateKey: { $gte: d, $lt: new Date(d.getTime() + 86400000) } };
}

async function assertAccounts(tx) {
  if (tx.type === "transfer" && tx.fromAccountId.equals(tx.toAccountId)) {
    throw new ApiError(400, "From and to account must be different.");
  }
  if (tx.type === "transfer" && (!tx.fromAccountId || !tx.toAccountId)) {
    throw new ApiError(400, "Transfer needs from and to accounts.");
  }
  const ids = [];
  if (tx.accountId) ids.push(tx.accountId);
  if (tx.fromAccountId) ids.push(tx.fromAccountId);
  if (tx.toAccountId) ids.push(tx.toAccountId);
  const count = await Account.countDocuments({ _id: { $in: ids }, userId: tx.userId });
  if (count !== new Set(ids.map(String)).size) {
    throw new ApiError(400, "One of the selected accounts does not exist.");
  }
}

export const list = asyncHandler(async (req, res) => {
  const { type, category, account, method, from, to, q, sort } = req.query;
  const filter = { userId: req.user._id };

  if (type && ["expense", "income", "transfer"].includes(type)) filter.type = type;
  if (category) filter.categoryId = category;
  if (method) filter.paymentMethod = method;
  if (account) {
    filter.$or = [{ accountId: account }, { fromAccountId: account }, { toAccountId: account }];
  }
  if (q) {
    filter.description = { $regex: q, $options: "i" };
  }
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = toDateOnly(new Date(from));
    if (to) filter.date.$lte = endOfDay(new Date(to));
  }

  const sortDir = sort === "asc" ? 1 : -1;
  const transactions = await Transaction.find(filter)
    .sort({ date: sortDir, createdAt: sortDir })
    .populate("categoryId", "name emoji color type")
    .populate("accountId", "name color icon")
    .populate("fromAccountId", "name color icon")
    .populate("toAccountId", "name color icon");

  return res.json({ transactions });
});

export const create = asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);
  const date = await buildDateValue(data.date, data.time);

  const doc = {
    userId: req.user._id,
    type: data.type,
    amount: roundMoney(data.amount),
    date,
    description: data.description || "",
    note: data.note || "",
  };
  if (data.type === "expense") {
    doc.categoryId = data.categoryId || null;
    doc.accountId = data.accountId || null;
    doc.paymentMethod = data.paymentMethod;
    doc.receiptId = data.receiptId || null;
  } else if (data.type === "income") {
    doc.source = data.source || "Other";
    doc.accountId = data.accountId || null;
    doc.paymentMethod = data.paymentMethod || "other";
  } else {
    doc.fromAccountId = data.fromAccountId;
    doc.toAccountId = data.toAccountId;
    if (data.description) doc.description = data.description;
  }

  const tx = new Transaction(doc);
  await assertAccounts(tx);

  // apply money movement
  const deltas = computeAccountDeltas({
    type: tx.type,
    accountId: tx.accountId,
    fromAccountId: tx.fromAccountId,
    toAccountId: tx.toAccountId,
    amount: tx.amount,
  });
  await tx.save();
  await applyDeltas(deltas);

  const out = await tx.populate([
    "categoryId",
    "accountId",
    "fromAccountId",
    "toAccountId",
  ]);
  return res.status(201).json({ transaction: out });
});

export const update = asyncHandler(async (req, res) => {
  const data = updateSchema.parse(req.body);
  const tx = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
  if (!tx) throw new ApiError(404, "Transaction not found.");

  const prevDeltas = computeAccountDeltas({
    type: tx.type,
    accountId: tx.accountId,
    fromAccountId: tx.fromAccountId,
    toAccountId: tx.toAccountId,
    amount: tx.amount,
  });

  if (data.amount !== undefined) tx.amount = roundMoney(data.amount);
  if (data.categoryId !== undefined) tx.categoryId = data.categoryId;
  if (data.accountId !== undefined) tx.accountId = data.accountId;
  if (data.fromAccountId !== undefined) tx.fromAccountId = data.fromAccountId;
  if (data.toAccountId !== undefined) tx.toAccountId = data.toAccountId;
  if (data.paymentMethod !== undefined) tx.paymentMethod = data.paymentMethod;
  if (data.source !== undefined) tx.source = data.source;
  if (data.description !== undefined) tx.description = data.description;
  if (data.note !== undefined) tx.note = data.note;
  if (data.date !== undefined || data.time !== undefined) {
    tx.date = await buildDateValue(
      data.date ?? tx.date,
      data.time ?? undefined,
    );
  }

  await assertAccounts(tx);

  const nextDeltas = computeAccountDeltas({
    type: tx.type,
    accountId: tx.accountId,
    fromAccountId: tx.fromAccountId,
    toAccountId: tx.toAccountId,
    amount: tx.amount,
  });

  // reverse previous then apply new
  await applyDeltas(prevDeltas.map((d) => ({ accountId: d.accountId, delta: -d.delta })));
  await applyDeltas(nextDeltas);
  await tx.save();

  const out = await tx.populate([
    "categoryId",
    "accountId",
    "fromAccountId",
    "toAccountId",
  ]);
  return res.json({ transaction: out });
});

export const remove = asyncHandler(async (req, res) => {
  const tx = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
  if (!tx) throw new ApiError(404, "Transaction not found.");

  const deltas = computeAccountDeltas({
    type: tx.type,
    accountId: tx.accountId,
    fromAccountId: tx.fromAccountId,
    toAccountId: tx.toAccountId,
    amount: tx.amount,
  });
  // reverse the effect
  await applyDeltas(deltas.map((d) => ({ accountId: d.accountId, delta: -d.delta })));
  await tx.deleteOne();
  return res.json({ message: "Transaction deleted." });
});

export const get = asyncHandler(async (req, res) => {
  const tx = await Transaction.findOne({ _id: req.params.id, userId: req.user._id }).populate([
    "categoryId",
    "accountId",
    "fromAccountId",
    "toAccountId",
  ]);
  if (!tx) throw new ApiError(404, "Transaction not found.");
  return res.json({ transaction: tx });
});

export const stats = asyncHandler(async (req, res) => {
  const today = effectiveDateOnly().dateKey;
  const monthStart = toDateOnly(new Date());
  monthStart.setDate(1);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1, 0);
  monthEnd.setHours(23, 59, 59, 999);

  const [total, todayDoc, month] = await Promise.all([
    Transaction.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: null,
          income: {
            $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] },
          },
          expense: {
            $sum: {
              $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0],
            },
          },
        },
      },
    ]),
    Transaction.aggregate([
      { $match: { userId: req.user._id, type: "expense", date: today } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          type: "expense",
          date: { $gte: monthStart, $lte: monthEnd },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
  ]);

  return res.json({
    allTimeIncome: roundMoney(total[0]?.income ?? 0),
    allTimeExpense: roundMoney(total[0]?.expense ?? 0),
    todayExpense: roundMoney(todayDoc[0]?.total ?? 0),
    todayCount: todayDoc[0]?.count ?? 0,
    monthExpense: roundMoney(month[0]?.total ?? 0),
    monthCount: month[0]?.count ?? 0,
  });
});