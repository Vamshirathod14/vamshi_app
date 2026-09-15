import { z } from "zod";
import { Reminder } from "../models/Reminder.js";
import { asyncHandler, ApiError } from "../middleware/handle.js";
import { combineDateTime, endOfDay } from "../utils/date.js";

const reminderSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().default(""),
  date: z.union([z.string(), z.date()]),
  time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  repeat: z.enum(["none", "daily", "weekly", "monthly", "yearly"]).default("none"),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  notificationEnabled: z.boolean().optional().default(true),
});

export const list = asyncHandler(async (req, res) => {
  const { upcoming, q } = req.query;
  const base = { userId: req.user._id };
  if (q) base.title = { $regex: q, $options: "i" };
  if (upcoming === "true") {
    base.completed = false;
    base.$or = [{ date: { $gte: endOfDay() } }, { date: { $gte: new Date() } }];
  }
  const reminders = await Reminder.find(base).sort({ date: 1, time: 1 });
  return res.json({ reminders });
});

export const create = asyncHandler(async (req, res) => {
  const data = reminderSchema.parse(req.body);
  const date = combineDateTime(data.date, data.time || null);
  const reminder = await Reminder.create({
    userId: req.user._id,
    ...data,
    date,
  });
  return res.status(201).json({ reminder });
});

export const update = asyncHandler(async (req, res) => {
  const data = reminderSchema.partial().parse(req.body);
  const existing = await Reminder.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!existing) throw new ApiError(404, "Reminder not found.");

  const update = { ...data };
  if (data.date !== undefined || data.time !== undefined) {
    update.date = combineDateTime(
      data.date ?? existing.date,
      data.time ?? existing.time ?? null,
    );
  }
  const reminder = await Reminder.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: update },
    { new: true, runValidators: true },
  );
  return res.json({ reminder });
});

export const complete = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!reminder) throw new ApiError(404, "Reminder not found.");
  reminder.completed = true;
  await reminder.save();
  return res.json({ reminder });
});

export const snooze = asyncHandler(async (req, res) => {
  const { minutes = 10 } = z.object({ minutes: z.number().default(10) }).parse(req.body);
  const reminder = await Reminder.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!reminder) throw new ApiError(404, "Reminder not found.");
  reminder.date = new Date(reminder.date.getTime() + minutes * 60_000);
  reminder.completed = false;
  reminder.snooze.lastSnoozedAt = new Date();
  reminder.snooze.times = (reminder.snooze.times || 0) + 1;
  await reminder.save();
  return res.json({ reminder });
});

export const remove = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!reminder) throw new ApiError(404, "Reminder not found.");
  return res.json({ message: "Reminder deleted." });
});