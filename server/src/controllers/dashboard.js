import { Account } from "../models/Account.js";
import { Transaction } from "../models/Transaction.js";
import { Task } from "../models/Task.js";
import { Reminder } from "../models/Reminder.js";
import { Goal } from "../models/Goal.js";
import { Budget } from "../models/Budget.js";
import { RecurringTransaction } from "../models/RecurringTransaction.js";
import { Notification } from "../models/Notification.js";
import { asyncHandler } from "../middleware/handle.js";
import { roundMoney } from "../utils/money.js";
import { startOfMonth, endOfMonth, startOfDay, endOfDay, monthKey } from "../utils/date.js";

export const overview = asyncHandler(async (req, res) => {
  const uid = req.user._id;
  const monthStart = startOfMonth();
  const monthEnd = endOfMonth();
  const dayStart = startOfDay();
  const dayEnd = endOfDay();
  const now = new Date();

  const [
    accounts,
    monthAgg,
    todayAgg,
    recentTxs,
    todayTasks,
    upcomingReminders,
    goals,
    budgets,
    upcomingRecurring,
    unreadCount,
  ] = await Promise.all([
    Account.find({ userId: uid }).sort({ createdAt: 1 }),
    Transaction.aggregate([
      {
        $match: { userId: uid, date: { $gte: monthStart, $lte: monthEnd }, type: { $ne: "transfer" } },
      },
      {
        $group: {
          _id: null,
          income: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
          expenses: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } },
          savings: { $sum: { $cond: [{ $eq: ["$type", "savings"] }, "$amount", 0] } },
        },
      },
    ]),
    Transaction.aggregate([
      {
        $match: { userId: uid, type: "expense", date: { $gte: dayStart, $lte: dayEnd } },
      },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
    Transaction.find({ userId: uid })
      .sort({ date: -1, createdAt: -1 })
      .limit(8)
      .populate("categoryId", "name emoji color type")
      .populate("accountId", "name color icon")
      .populate("fromAccountId", "name color icon")
      .populate("toAccountId", "name color icon"),
    Task.find({
      userId: uid,
      completed: false,
      $or: [{ dueDate: { $gte: dayStart, $lte: dayEnd } }, { dueDate: null }],
    }).sort({ dueDate: 1, createdAt: -1 }),
    Reminder.find({
      userId: uid,
      completed: false,
      date: { $gte: now },
    })
      .sort({ date: 1 })
      .limit(6),
    Goal.find({ userId: uid, completedAt: null })
      .sort({ createdAt: -1 })
      .limit(3),
    Budget.find({ userId: uid, month: monthKey() }),
    RecurringTransaction.find({ userId: uid, active: true, nextRunDate: { $gte: now } })
      .sort({ nextRunDate: 1 })
      .limit(6),
    Notification.countDocuments({ userId: uid, read: false }),
  ]);

  const totalBalance = roundMoney(accounts.reduce((s, a) => s + a.balance, 0));
  const m = monthAgg[0] || {};
  const income = roundMoney(m.income ?? 0);
  const expenses = roundMoney(m.expenses ?? 0);
  const today = todayAgg[0];

  // today's tasks with time labels
  const todayTasksDto = todayTasks.map((t) => ({
    id: t._id,
    title: t.title,
    done: t.completed,
    dueTime: t.dueTime,
    priority: t.priority,
  }));

  const upcomingPaymentDto = upcomingRecurring.map((r) => ({
    id: r._id,
    type: r.type,
    amount: r.amount,
    description: r.description || (r.type === "income" ? "Recurring income" : "Recurring expense"),
    date: r.nextRunDate,
  }));

  const goalsDto = goals.map((g) => ({
    id: g._id,
    name: g.name,
    emoji: g.emoji,
    color: g.color,
    targetAmount: g.targetAmount,
    currentAmount: g.currentAmount,
    percent: g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0,
  }));

  return res.json({
    greeting: null,
    totalBalance,
    month: { income, expenses, savings: roundMoney(income - expenses) },
    today: { spent: roundMoney(today?.total ?? 0), count: today?.count ?? 0 },
    accounts: accounts.length,
    recentTransactions: recentTxs,
    todayTasks: todayTasksDto,
    upcomingReminders,
    goals: goalsDto,
    budgetCount: budgets.length,
    upcomingPayments: upcomingPaymentDto,
    unread: unreadCount,
  });
});