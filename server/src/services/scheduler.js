import { Reminder } from "../models/Reminder.js";
import { Task } from "../models/Task.js";
import { User } from "../models/User.js";
import { deliverScheduledNotification } from "./notifications.js";

// ================= Recurrence math =================

function addMonthClamped(date) {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d;
}

/**
 * Next occurrence of a repeating reminder, delta from the CURRENT occurrence.
 * Time-of-day (the user's intended wall-clock) is preserved — no server
 * timezone assumptions: the stored `date` IS the user's local time.
 */
export function computeNextOccurrence(date, repeat) {
  const d = new Date(date);
  switch (repeat) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      return addMonthClamped(d);
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      return d;
    default:
      return new Date(date);
  }
  return d;
}

/** Advance an occurrence until it lands in the future (guards against floods). */
export function advanceToFuture(date, repeat, now = new Date()) {
  let next = new Date(date);
  let guard = 0;
  while (next <= now && guard < 5000) {
    const candidate = computeNextOccurrence(next, repeat);
    if (candidate.getTime() === next.getTime()) break; // non-repeating
    next = candidate;
    guard++;
  }
  return next > now ? next : new Date(now);
}

// ================= User gates =================

async function notificationSettings(userId) {
  const user = await User.findById(userId).select(
    "notificationsEnabled notificationPrefs",
  );
  if (!user) return { push: false, inApp: false };
  const enabled = user.notificationsEnabled !== false;
  return {
    push: enabled && user.notificationPrefs?.generalReminders !== false,
    inApp: enabled,
    taskPush: enabled && user.notificationPrefs?.taskReminders !== false,
  };
}

// ================= Due scan =================

export const schedulerState = {
  lastSweepAt: null,
  lastRemindersSeen: 0,
  lastTasksSeen: 0,
  lastError: null,
};

function deliveryKey(kind, userId, refId, ts) {
  return `${kind}:${userId}:${refId}:${new Date(ts).getTime()}`;
}

/**
 * One polling sweep. Safe to call from setInterval and on boot; concurrency is
 * handled by the unique deliveryKey claim inside deliverScheduledNotification,
 * so two overlapping sweeps can never double-notify.
 */
export async function scanDueNotifications(now = new Date()) {
  const counts = { reminders: 0, tasks: 0, notified: 0, deduped: 0 };

  // Catch-up: past-due NON-repeating reminders older than a day are silently
  // completed instead of spamming a fresh feature with a backlog of missed
  // alarms.
  const archived = await Reminder.updateMany(
    {
      completed: false,
      repeat: "none",
      notificationEnabled: true,
      date: { $lt: new Date(now.getTime() - 12 * 60 * 60 * 1000) },
    },
    { $set: { completed: true } },
  );
  if (archived.modifiedCount > 0) {
    console.info(
      `[push] archived ${archived.modifiedCount} stale one-off reminder(s) (>12h overdue)`,
    );
  }

  // ---- Reminders ----
  const dueReminders = await Reminder.find({
    completed: false,
    notificationEnabled: true,
    date: { $lte: now },
  }).lean();
  schedulerState.lastSweepAt = new Date();
  schedulerState.lastRemindersSeen = dueReminders.length;
  console.info(
    `[push] sweep @${now.toISOString()}: ${dueReminders.length} reminder(s) due`,
  );
  if (dueReminders.length > 0) {
    console.info(
      `[push] reminders now: ${dueReminders.map((r) => `"${r.title}"`).join(", ")}`,
    );
  }

  for (const r of dueReminders) {
    const scheduledTime = r.date;
    const key = deliveryKey("reminder", r.userId, r._id, scheduledTime);
    const settings = await notificationSettings(r.userId);

    console.info(
      `[push] firing reminder "${r.title}" user=${String(r.userId).slice(-6)} push=${settings.push} inApp=${settings.inApp}`,
    );

    counts.reminders++;
    if (settings.inApp && !settings.push) {
      console.info(
        `[push] reminder "${r.title}" fired IN-APP only — push off in user reminder prefs`,
      );
    }
    const res = await deliverScheduledNotification({
      userId: r.userId,
      source: "reminder",
      deliveryKey: key,
      referenceId: r._id,
      scheduledTime,
      title: r.title,
      body: r.description || "Your Vamshi reminder is due.",
      url: "/reminders",
      createInAppNotification: settings.inApp,
      push: settings.push,
    });
    res.deduped ? counts.deduped++ : (counts.notified += res.notified || 0);

    // Advance recurring reminders to their next occurrence; complete one-offs.
    if (r.repeat !== "none") {
      await Reminder.updateOne(
        { _id: r._id },
        { $set: { date: advanceToFuture(r.date, r.repeat, now) } },
      );
    } else {
      await Reminder.updateOne(
        { _id: r._id },
        { $set: { completed: true } },
      );
    }
  }

  // ---- Tasks (only when an explicit reminder time exists) ----
  const dueTasks = await Task.find({
    completed: false,
    reminderEnabled: true,
    reminderAt: { $ne: null, $lte: now },
  }).lean();
  schedulerState.lastTasksSeen = dueTasks.length;

  for (const t of dueTasks) {
    const scheduledTime = t.reminderAt;
    const key = deliveryKey("task", t.userId, t._id, scheduledTime);
    const settings = await notificationSettings(t.userId);

    counts.tasks++;
    if (settings.inApp && !settings.taskPush) {
      console.info(
        `[push] task reminder "${t.title}" fired IN-APP only — push off in user task prefs`,
      );
    }
    const res = await deliverScheduledNotification({
      userId: t.userId,
      source: "task",
      deliveryKey: key,
      referenceId: t._id,
      scheduledTime,
      title: "Task reminder: " + t.title,
      body: t.description || "Your Vamshi task reminder is due.",
      url: "/tasks",
      createInAppNotification: settings.inApp,
      push: settings.taskPush,
    });
    res.deduped ? counts.deduped++ : (counts.notified += res.notified || 0);

    // One-shot: disable the reminder so a completed/done task never re-fires.
    await Task.updateOne(
      { _id: t._id },
      { $set: { reminderEnabled: false } },
    );
  }

  return counts;
}