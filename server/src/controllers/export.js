import {
  User,
  Account,
  Category,
  Transaction,
  Budget,
  Goal,
  Task,
  Note,
  Reminder,
  RecurringTransaction,
  Notification,
  Receipt,
} from "../models/index.js";
import { asyncHandler } from "../middleware/handle.js";
import { toDateInputValue } from "../utils/date.js";
import { roundMoney } from "../utils/money.js";

function escapeCsv(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const exportCsv = asyncHandler(async (req, res) => {
  const { type = "transactions", from, to } = req.query;
  const filter = { userId: req.user._id };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const map = {
    transactions: async () => {
      const rows = await Transaction.find(filter).sort({ date: 1 });
      const header = ["Date", "Time", "Type", "Category", "Source", "Account", "From Account", "To Account", "Amount", "Payment Method", "Description", "Note"];
      const lines = [header.join(",")];
      for (const t of rows) {
        lines.push(
          [
            toDateInputValue(t.date),
            t.date.toTimeString().slice(0, 5),
            t.type,
            t.type !== "income" ? "" : t.source,
            "",
            "",
            "",
            "",
            t.amount,
            t.paymentMethod || "",
            t.description,
            t.note,
          ].join(","),
        );
      }
      return lines.join("\n");
    },
    tasks: async () => {
      const rows = await Task.find({ userId: req.user._id }).sort({ createdAt: -1 });
      const header = ["Title", "Description", "Due Date", "Priority", "Completed", "Created At"];
      const lines = [header.join(",")];
      for (const t of rows) {
        lines.push(
          [
            escapeCsv(t.title),
            escapeCsv(t.description),
            t.dueDate ? toDateInputValue(t.dueDate) : "",
            t.priority,
            t.completed ? "yes" : "no",
            t.createdAt.toISOString(),
          ].join(","),
        );
      }
      return lines.join("\n");
    },
    notes: async () => {
      const rows = await Note.find({ userId: req.user._id }).sort({ updatedAt: -1 });
      const header = ["Title", "Content", "Tags", "Pinned", "Archived", "Updated At"];
      const lines = [header.join(",")];
      for (const n of rows) {
        lines.push(
          [
            escapeCsv(n.title),
            escapeCsv(n.content),
            escapeCsv(n.tags.join(";")),
            n.pinned ? "yes" : "no",
            n.archived ? "yes" : "no",
            n.updatedAt.toISOString(),
          ].join(","),
        );
      }
      return lines.join("\n");
    },
    goals: async () => {
      const rows = await Goal.find({ userId: req.user._id }).sort({ createdAt: -1 });
      const header = ["Name", "Target", "Current", "Percent", "Target Date", "Completed"];
      const lines = [header.join(",")];
      for (const g of rows) {
        lines.push(
          [
            escapeCsv(g.name),
            g.targetAmount,
            g.currentAmount,
            g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0,
            g.targetDate ? toDateInputValue(g.targetDate) : "",
            g.completedAt ? "yes" : "no",
          ].join(","),
        );
      }
      return lines.join("\n");
    },
  };

  const fn = map[type] || map.transactions;
  const csv = await fn();
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="liv-${type}.csv"`);
  return res.send(csv);
});

export const exportJson = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const [user, accounts, categories, transactions, budgets, goals, tasks, notes, reminders, recurring] =
    await Promise.all([
      User.findById(userId),
      Account.find({ userId }),
      Category.find({ userId }),
      Transaction.find({ userId }),
      Budget.find({ userId }),
      Goal.find({ userId }),
      Task.find({ userId }),
      Note.find({ userId }),
      Reminder.find({ userId }),
      RecurringTransaction.find({ userId }),
    ]);

  const data = {
    app: "vault",
    version: 1,
    exportedAt: new Date().toISOString(),
    user: user.toSafe(),
    accounts,
    categories,
    transactions,
    budgets,
    goals,
    tasks,
    notes,
    reminders,
    recurring,
  };

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", 'attachment; filename="liv-backup.json"');
  return res.send(JSON.stringify(data, null, 2));
});

export const importJson = asyncHandler(async (req, res) => {
  const { data } = req.body;
  if (!data || typeof data !== "object" || data.app !== "vault") {
    return res.status(400).json({ message: "That doesn't look like a Liv backup." });
  }
  const userId = req.user._id;

  const accounts = Array.isArray(data.accounts) ? data.accounts : [];
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const created = { accounts: 0, categories: 0, transactions: 0, budgets: 0, goals: 0, tasks: 0, notes: 0, reminders: 0, recurring: 0 };

  const accIdMap = new Map();
  const catIdMap = new Map();

  for (const a of accounts) {
    if (!a?.name) continue;
    const doc = await Account.create({
      userId,
      name: a.name,
      type: a.type || "other",
      balance: roundMoney(a.balance ?? 0),
      icon: a.icon || null,
      color: a.color || "#6366f1",
    });
    accIdMap.set(String(a._id || a.id), doc._id.toString());
    created.accounts++;
  }
  for (const c of categories) {
    if (!c?.name) continue;
    const doc = await Category.create({
      userId,
      name: c.name,
      emoji: c.emoji || "📦",
      color: c.color || "#64748b",
      type: c.type || "expense",
      isDefault: !!c.isDefault,
    });
    catIdMap.set(String(c._id || c.id), doc._id.toString());
    created.categories++;
  }

  const remapAcc = (id) => (id ? accIdMap.get(String(id)) || null : null);
  const remapCat = (id) => (id ? catIdMap.get(String(id)) || null : null);

  for (const t of Array.isArray(data.transactions) ? data.transactions : []) {
    if (!t?.type || !t?.amount) continue;
    await Transaction.create({
      userId,
      type: t.type,
      amount: roundMoney(t.amount),
      categoryId: t.type === "expense" ? remapCat(t.categoryId) : null,
      accountId: t.type !== "transfer" ? remapAcc(t.accountId) : null,
      fromAccountId: t.type === "transfer" ? remapAcc(t.fromAccountId) : null,
      toAccountId: t.type === "transfer" ? remapAcc(t.toAccountId) : null,
      paymentMethod: t.paymentMethod || "other",
      source: t.source || null,
      description: t.description || "",
      note: t.note || "",
      date: t.date ? new Date(t.date) : new Date(),
    });
    created.transactions++;
  }

  for (const b of Array.isArray(data.budgets) ? data.budgets : []) {
    if (!b?.categoryId || !b?.limit || !b?.month) continue;
    await Budget.create({ userId, categoryId: remapCat(b.categoryId), month: b.month, limit: roundMoney(b.limit) });
    created.budgets++;
  }
  for (const g of Array.isArray(data.goals) ? data.goals : []) {
    if (!g?.name || !g?.targetAmount) continue;
    await Goal.create({
      userId,
      name: g.name,
      emoji: g.emoji || "🎯",
      color: g.color || "#8b5cf6",
      targetAmount: roundMoney(g.targetAmount),
      currentAmount: roundMoney(g.currentAmount ?? 0),
      targetDate: g.targetDate ? new Date(g.targetDate) : null,
      contributions: (g.contributions || []).map((c) => ({
        amount: roundMoney(c.amount),
        date: new Date(c.date || Date.now()),
        accountId: remapAcc(c.accountId),
        note: c.note || "",
      })),
    });
    created.goals++;
  }
  for (const t of Array.isArray(data.tasks) ? data.tasks : []) {
    if (!t?.title) continue;
    await Task.create({
      userId,
      title: t.title,
      description: t.description || "",
      dueDate: t.dueDate ? new Date(t.dueDate) : null,
      dueTime: t.dueTime || null,
      priority: t.priority || "medium",
      completed: !!t.completed,
      reminderEnabled: !!t.reminderEnabled,
      repeat: t.repeat || "none",
    });
    created.tasks++;
  }
  for (const n of Array.isArray(data.notes) ? data.notes : []) {
    if (!n?.title && !n?.content && !n?.checklist?.length) continue;
    await Note.create({
      userId,
      title: n.title || "",
      content: n.content || "",
      pinned: !!n.pinned,
      archived: !!n.archived,
      tags: n.tags || [],
      checklist: (n.checklist || []).map((c) => ({ text: c.text, checked: c.checked })),
    });
    created.notes++;
  }
  for (const r of Array.isArray(data.reminders) ? data.reminders : []) {
    if (!r?.title || !r?.date) continue;
    await Reminder.create({
      userId,
      title: r.title,
      description: r.description || "",
      date: new Date(r.date),
      time: r.time || null,
      repeat: r.repeat || "none",
      priority: r.priority || "medium",
    });
    created.reminders++;
  }
  for (const r of Array.isArray(data.recurring) ? data.recurring : []) {
    if (!r?.amount || !r?.startDate || !r?.frequency) continue;
    await RecurringTransaction.create({
      userId,
      type: r.type || "expense",
      amount: roundMoney(r.amount),
      categoryId: remapCat(r.categoryId),
      accountId: remapAcc(r.accountId),
      paymentMethod: r.paymentMethod || "other",
      description: r.description || "",
      frequency: r.frequency,
      startDate: new Date(r.startDate),
      endDate: r.endDate ? new Date(r.endDate) : null,
      active: r.active !== false,
    });
    created.recurring++;
  }

  return res.status(201).json({ message: "Data imported.", created });
});