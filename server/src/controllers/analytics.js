import { Transaction } from "../models/Transaction.js";
import { Account } from "../models/Account.js";
import { asyncHandler } from "../middleware/handle.js";
import { roundMoney } from "../utils/money.js";
import { toDateOnly, startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear, monthKey } from "../utils/date.js";

const TRANSFER = { $eq: ["$type", "transfer"] };

function rangeFor(period, from, to) {
  const now = new Date();
  switch (period) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "week":
      return { start: startOfWeek(now), end: endOfDay(now) };
    case "month":
      return { start: startOfMonth(now), end: endOfDay(now) };
    case "year":
      return { start: startOfYear(now), end: endOfDay(now) };
    case "custom":
      return {
        start: from ? startOfDay(new Date(from)) : startOfMonth(now),
        end: to ? endOfDay(new Date(to)) : endOfDay(now),
      };
    default:
      return { start: startOfMonth(now), end: endOfDay(now) };
  }
}

export const summary = asyncHandler(async (req, res) => {
  const { period = "month", from, to } = req.query;
  const { start, end } = rangeFor(period, from, to);

  const [accounts, group] = await Promise.all([
    Account.aggregate([{ $match: { userId: req.user._id } }, { $project: { name: 1, color: 1, icon: 1, balance: 1 } }]),
    Transaction.aggregate([
      {
        $match: { userId: req.user._id, date: { $gte: start, $lte: end } },
      },
      {
        $group: {
          _id: null,
          income: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
          expense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } },
          avg: {
            $avg: {
              $cond: [{ $eq: ["$type", "expense"] }, "$amount", null],
            },
          },
        },
      },
    ]),
  ]);

  const g = group[0] || {};
  const income = roundMoney(g.income ?? 0);
  const expense = roundMoney(g.expense ?? 0);
  const totalBalance = roundMoney(
    accounts.reduce((s, a) => s + a.balance, 0),
  );

  return res.json({
    income,
    expense,
    savings: roundMoney(income - expense),
    totalBalance,
    averageDailySpend: roundMoney(g.avg ?? 0),
    accountCount: accounts.length,
  });
});

export const categoryBreakdown = asyncHandler(async (req, res) => {
  const { period = "month", from, to } = req.query;
  const { start, end } = rangeFor(period, from, to);

  const rows = await Transaction.aggregate([
    {
      $match: { userId: req.user._id, type: "expense", date: { $gte: start, $lte: end } },
    },
    {
      $lookup: {
        from: "categories",
        localField: "categoryId",
        foreignField: "_id",
        as: "cat",
      },
    },
    { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { categoryId: "$categoryId", name: "$cat.name", emoji: "$cat.emoji", color: "$cat.color" },
        amount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { amount: -1 } },
  ]);

  const categories = rows.map((r) => ({
    id: r._id.categoryId?.toString(),
    name: r._id.name || "Uncategorized",
    emoji: r._id.emoji || "📦",
    color: r._id.color || "#64748b",
    amount: roundMoney(r.amount),
    count: r.count,
  }));

  return res.json({ categories });
});

export const trend = asyncHandler(async (req, res) => {
  const { months = 6, type = "expense" } = req.query;
  const n = Math.min(Number.parseInt(months, 10) || 6, 24);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (n - 1), 1);

  const rows = await Transaction.aggregate([
    {
      $match: { userId: req.user._id, date: { $gte: start }, type: { $ne: "transfer" } },
    },
    {
      $group: {
        _id: { y: { $year: "$date" }, m: { $month: "$date" }, type: "$type" },
        amount: { $sum: "$amount" },
      },
    },
  ]);

  const byType = {};
  for (const r of rows) {
    const key = `${r._id.y}-${String(r._id.m).padStart(2, "0")}`;
    byType[key] = byType[key] || { income: 0, expense: 0 };
    byType[key][r._id.type] = roundMoney(r.amount);
  }

  const points = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    const key = monthKey(d);
    const val = byType[key] || { income: 0, expense: 0 };
    points.push({
      month: d.toLocaleDateString("en-IN", { month: "short" }),
      key,
      income: val.income,
      expense: val.expense,
    });
  }

  if (type === "income") return res.json({ points: points.map((p) => ({ month: p.month, key: p.key, amount: p.income })) });
  if (type === "savings")
    return res.json({ points: points.map((p) => ({ month: p.month, key: p.key, amount: roundMoney(p.income - p.expense) })) });
  return res.json({ points: points.map((p) => ({ month: p.month, key: p.key, amount: p.expense })) });
});

export const insights = asyncHandler(async (req, res) => {
  const { period = "month", from, to } = req.query;
  const { start, end } = rangeFor(period, from, to);
  const now = new Date();

  const [rows, prevRows, totals, largest, byAccount, byMethod] = await Promise.all([
    Transaction.aggregate([
      { $match: { userId: req.user._id, type: "expense", date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: "$categoryId",
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          type: "expense",
          date: {
            $gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            $lt: start,
          },
        },
      },
      { $group: { _id: null, amount: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate([
      {
        $match: { userId: req.user._id, date: { $gte: start, $lte: end } },
      },
      {
        $group: {
          _id: null,
          income: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
          expense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } },
          count: { $sum: 1 },
        },
      },
    ]),
    Transaction.findOne({
      userId: req.user._id,
      type: "expense",
      date: { $gte: start, $lte: end },
    }).sort({ amount: -1 }),
    Transaction.aggregate([
      {
        $match: { userId: req.user._id, type: "expense", date: { $gte: start, $lte: end } },
      },
      {
        $group: {
          _id: "$accountId",
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { amount: -1 } },
      { $limit: 4 },
    ]),
    Transaction.aggregate([
      {
        $match: { userId: req.user._id, type: "expense", date: { $gte: start, $lte: end } },
      },
      {
        $group: {
          _id: "$paymentMethod",
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { amount: -1 } },
    ]),
  ]);

  const total = totals[0] || {};
  const currentExpense = roundMoney(total.expense ?? 0);
  const prevExpense = roundMoney(prevRows[0]?.amount ?? 0);

  let spendChange = null;
  if (prevExpense > 0) {
    spendChange = Math.round(((currentExpense - prevExpense) / prevExpense) * 100);
  }

  // account details for by-account breakdown
  const accountIds = byAccount.filter((r) => r._id).map((r) => r._id.toString());
  const accounts = accountIds.length
    ? await Account.find({ _id: { $in: accountIds } }).select("name color icon")
    : [];

  const accountMap = new Map(accounts.map((a) => [a._id.toString(), a]));

  return res.json({
    spendChange,
    totalSpend: currentExpense,
    transactionCount: total.count ?? 0,
    largestExpense: largest
      ? {
          id: largest._id,
          amount: roundMoney(largest.amount),
          description: largest.description || "Expense",
          date: largest.date,
        }
      : null,
    topSpend: {
      total: rows[0]?.amount ? roundMoney(rows[0].amount) : 0,
    },
    byAccount: byAccount.map((r) => ({
      id: r._id?.toString(),
      name: accountMap.get(r._id?.toString())?.name || "Other",
      color: accountMap.get(r._id?.toString())?.color || "#64748b",
      icon: accountMap.get(r._id?.toString())?.icon || "",
      amount: roundMoney(r.amount),
    })),
    byMethod: byMethod.map((r) => ({
      method: r._id || "other",
      amount: roundMoney(r.amount),
    })),
  });
});