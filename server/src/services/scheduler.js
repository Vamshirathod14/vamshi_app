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

// ================= Greetings & festival broadcasts =================
// The app's audience runs on IST (+5:30). The server may be UTC (Render) or
// IST (laptop) — derive the IST wall-clock explicitly so these fire at the
// right local hour regardless of where the process runs.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const FESTIVAL_HOUR = 9; // 9am IST

export function istWallClock(now = new Date()) {
  return new Date(now.getTime() + IST_OFFSET_MS);
}

function slotEpoch(ist, hour) {
  const utc = Date.UTC(
    ist.getUTCFullYear(),
    ist.getUTCMonth(),
    ist.getUTCDate(),
    hour,
    0,
    0,
  );
  return utc - IST_OFFSET_MS;
}

const GREETINGS = {
  morning: {
    hour: 9,
    title: "Good morning ☀️",
    body: "A new day, a fresh start. Open Vamshi and stay on top of today's plan and spending.",
  },
  afternoon: {
    hour: 14,
    title: "Good afternoon 🌤️",
    body: "Quick check-in: log any expenses from this morning so the afternoon stays on track.",
  },
  evening: {
    hour: 19,
    title: "Good evening 🌙",
    body: "Before the day winds down, save today's spend and prep tomorrow. You've got this!",
  },
};

// Built-in festival/event list for 2026, fired once at 9am IST on the day.
// Format: 2026-YYYY-MM-DD (IST). Edit freely each year.
const FESTIVALS_2026 = [
  { date: "2026-01-01", title: "Happy New Year! 🎉", body: "New year, new financial goals — log your first expense of 2026 with Vamshi." },
  { date: "2026-01-15", title: "Happy Pongal / Sankranti! 🪁", body: "Season of new beginnings — track your festive spending and stay in control." },
  { date: "2026-01-26", title: "Happy Republic Day! 🇮🇳", body: "Celebrate proudly and spend wisely. Log today's outings with Vamshi." },
  { date: "2026-02-14", title: "Happy Valentine's Day! 💝", body: "Love is sweet — and so is watching your budget. Record the day's treats." },
  { date: "2026-03-19", title: "Happy Ugadi! 🌸", body: "A new Telugu year begins — fresh budget, fresh blessings. Start logging today." },
  { date: "2026-03-21", title: "Happy Holi! 🎨", body: "A splash of colour and joy — don't let the festive fun blur your budget." },
  { date: "2026-03-31", title: "Eid Mubarak! 🌙", body: "May your days be abundant. Log the celebrations and keep every rupee counted." },
  { date: "2026-08-31", title: "Happy Raksha Bandhan! 🪢", body: "Celebrate the bond with love — and keep those gift spends recorded." },
  { date: "2026-09-14", title: "Ganesh Chaturthi! 🙏", body: "Ganpati Bappa Morya! Enjoy the festivities — track your expenses with ease." },
  { date: "2026-10-16", title: "Happy Dussehra! 🏹", body: "Good triumphs over evil. Celebrate big, but mind the budget too." },
  { date: "2026-11-08", title: "Happy Diwali! 🪔", body: "Light, laughter and sweets — may your savings shine the brightest. Log your festive spends." },
  { date: "2026-12-25", title: "Merry Christmas! 🎄", body: "A season of giving and cheer — keep your holiday spending merry and mindful." },
];

/**
 * Which system broadcasts are due right now, if any. Returns an array of
 * {slot, title, body, refDay, ts} where ts is the STABLE epoch for that
 * slot's day/hour — the deliveryKey built from it is identical across every
 * poll in the window, so the unique-key guard fires the message exactly once.
 */
export function systemBroadcastFor(now = new Date()) {
  const ist = istWallClock(now);
  const results = [];
  if (ist.getUTCMinutes() >= 5) return results;
  const day = ist.toISOString().slice(0, 10);
  for (const [key, g] of Object.entries(GREETINGS)) {
    if (g.hour === ist.getUTCHours()) {
      results.push({
        slot: `greet-${key}`,
        title: g.title,
        body: g.body,
        refDay: day,
        ts: slotEpoch(ist, g.hour),
      });
    }
  }
  if (ist.getUTCHours() === FESTIVAL_HOUR) {
    const fest = FESTIVALS_2026.find((f) => f.date === day);
    if (fest) {
      results.push({
        slot: "fest",
        title: fest.title,
        body: fest.body,
        refDay: day,
        ts: slotEpoch(ist, FESTIVAL_HOUR),
      });
    }
  }
  return results;
}

function deliveryKey(kind, userId, refId, ts) {
  return `${kind}:${userId}:${refId}:${new Date(ts).getTime()}`;
}

/**
 * One polling sweep. Safe to call from setInterval and on boot; concurrency is
 * handled by the unique deliveryKey claim inside deliverScheduledNotification,
 * so two overlapping sweeps can never double-notify.
 */
export async function scanDueNotifications(now = new Date()) {
  const counts = { reminders: 0, tasks: 0, notified: 0, deduped: 0, broadcasts: 0 };

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

  // ---- Daily greetings & festival broadcasts (once per day per user) ----
  const broadcasts = systemBroadcastFor(now);
  for (const b of broadcasts) {
    const userIds = await User.find({ notificationsEnabled: { $ne: false } })
      .select("_id")
      .lean();
    let slotNotified = 0;
    for (const { _id } of userIds) {
      const key = deliveryKey(`sys-${b.slot}`, _id, b.refDay, b.ts);
      const res = await deliverScheduledNotification({
        userId: _id,
        source: "system",
        deliveryKey: key,
        scheduledTime: new Date(b.ts),
        title: b.title,
        body: b.body,
        url: "/",
        createInAppNotification: false,
        push: true,
      });
      res.deduped ? counts.deduped++ : (slotNotified += res.notified || 0);
    }
    counts.notified += slotNotified;
    if (slotNotified > 0) {
      counts.broadcasts++;
      console.info(
        `[push] broadcast "${b.title}" → ${slotNotified} device(s)`,
      );
    }
  }

  return counts;
}