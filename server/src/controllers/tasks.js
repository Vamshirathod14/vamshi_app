import { z } from "zod";
import { Task } from "../models/Task.js";
import { asyncHandler, ApiError } from "../middleware/handle.js";
import { toDateOnly, endOfDay, combineDateTime } from "../utils/date.js";

const PRIORITIES = ["high", "medium", "low"];
const REPEATS = ["none", "daily", "weekly", "monthly"];

const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().default(""),
  dueDate: z.union([z.string(), z.date()]).nullable().optional(),
  dueTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  priority: z.enum(PRIORITIES).default("medium"),
  reminderEnabled: z.boolean().optional().default(false),
  reminderAt: z.union([z.string(), z.date()]).nullable().optional(),
  repeat: z.enum(REPEATS).default("none"),
  noteId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
});

// reminderAt is derived server-side from the due date/time (single source of
// truth): enabling the reminder without a due date is meaningless, and
// disabling it clears any pending fire.
function computeReminder(data, existing = {}) {
  const enabled = data.reminderEnabled ?? existing.reminderEnabled ?? false;
  if (!enabled) return { reminderEnabled: false, reminderAt: null };
  // Client already resolved the user's wall-clock to an absolute instant.
  if (data.reminderAt) {
    const t = new Date(data.reminderAt);
    if (!Number.isNaN(t.getTime())) {
      return { reminderEnabled: true, reminderAt: t };
    }
  }
  const dueDate = data.dueDate ?? existing.dueDate;
  if (!dueDate) return { reminderEnabled: false, reminderAt: null };
  const dueTime = data.dueTime ?? existing.dueTime ?? "23:59";
  return { reminderEnabled: true, reminderAt: combineDateTime(dueDate, dueTime) };
}

export const list = asyncHandler(async (req, res) => {
  const { filter = "all", q } = req.query;
  const base = { userId: req.user._id };
  if (q) base.title = { $regex: q, $options: "i" };

  if (filter === "today") {
    const start = toDateOnly();
    const end = endOfDay();
    base.completed = false;
    base.$or = [{ dueDate: { $gte: start, $lte: end } }, { dueDate: null }];
  } else if (filter === "upcoming") {
    base.completed = false;
    base.dueDate = { $gte: endOfDay() };
  } else if (filter === "overdue") {
    base.completed = false;
    base.dueDate = { $lt: toDateOnly() };
  } else if (filter === "completed") {
    base.completed = true;
  }

  const tasks = await Task.find(base)
    .sort({ completed: 1, dueDate: 1, createdAt: -1 })
    .populate("noteId", "title");
  return res.json({ tasks });
});

export const create = asyncHandler(async (req, res) => {
  const data = taskSchema.parse(req.body);
  const reminder = computeReminder(data);
  const task = await Task.create({ userId: req.user._id, ...data, ...reminder });
  return res.status(201).json({ task });
});

export const update = asyncHandler(async (req, res) => {
  const data = taskSchema.partial().parse(req.body);
  const existing = await Task.findOne({ _id: req.params.id, userId: req.user._id });
  if (!existing) throw new ApiError(404, "Task not found.");
  const reminder = computeReminder(data, existing);
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { ...data, ...reminder } },
    { new: true, runValidators: true },
  );
  if (!task) throw new ApiError(404, "Task not found.");
  return res.json({ task });
});

export const toggle = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
  if (!task) throw new ApiError(404, "Task not found.");
  task.completed = !task.completed;
  task.completedAt = task.completed ? new Date() : null;
  await task.save();

  // repeating task: if completed and repeat active, reset with next occurrence (no due date set)
  if (task.completed && task.repeat !== "none") {
    task.completed = false;
    await task.save();
  }
  return res.json({ task });
});

export const remove = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!task) throw new ApiError(404, "Task not found.");
  return res.json({ message: "Task deleted." });
});