import { Reminder } from "../models/Reminder.js";
import { Task } from "../models/Task.js";
import { User } from "../models/User.js";
import { Festival } from "../models/Festival.js";
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

// Alarm burst: repeat the reminder push every ALARM_TICK_MS so it rings like
// an alarm UNTIL the user dismisses it (taps the notification or presses the
// in-app Dismiss button → ack endpoint completes the reminder). No time cap —
// the only safety stop is the stale-archive sweep (>12h overdue).
const ALARM_TICK_MS = 15_000;

let lastQuietLogAt = 0;

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

// Built-in festival/event days live in the Festival collection (seeded from
// config/seed.js), editable by the owner from the admin panel — no redeploy.

/**
 * Which system broadcasts are due right now, if any. Returns an array of
 * {slot, title, body, refDay, ts} where ts is the STABLE epoch for that
 * slot's day/hour — the deliveryKey built from it is identical across every
 * poll in the window, so the unique-key guard fires the message exactly once.
 * `todayFestival` (a Festival doc for { date }) is resolved by the caller so
 * this stays pure & unit-testable.
 */
export function systemBroadcastFor(now = new Date(), todayFestival = null) {
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
  if (
    ist.getUTCHours() === FESTIVAL_HOUR &&
    todayFestival &&
    todayFestival.active !== false
  ) {
    results.push({
      slot: "fest",
      title: todayFestival.title,
      body: todayFestival.body,
      refDay: day,
      ts: slotEpoch(ist, FESTIVAL_HOUR),
    });
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
  if (dueReminders.length > 0 || now.getTime() - lastQuietLogAt >= 90_000) {
    console.info(
      `[push] sweep @${now.toISOString()}: ${dueReminders.length} reminder(s) due`,
    );
    lastQuietLogAt = now.getTime();
  }
  if (dueReminders.length > 0) {
    console.info(
      `[push] reminders now: ${dueReminders.map((r) => `"${r.title}"`).join(", ")}`,
    );
  }

  for (const r of dueReminders) {
    const scheduledTime = r.date;

    // ----- Alarm mode: ring every ~15s until dismissed (ack), no time cap -----
    if (r.repeat === "none" && r.alarmMode !== false) {
      const elapsed = now.getTime() - scheduledTime.getTime();
      const tick = Math.max(0, Math.floor(elapsed / ALARM_TICK_MS));
      const tickTime = new Date(scheduledTime.getTime() + tick * ALARM_TICK_MS);
      const settings = await notificationSettings(r.userId);

      console.info(
        `[push] alarm reminder "${r.title}" user=${String(r.userId).slice(-6)} tick=${tick} push=${settings.push}`,
      );
      counts.reminders++;
      const res = await deliverScheduledNotification({
        userId: r.userId,
        source: "reminder",
        deliveryKey: deliveryKey("alarm", r.userId, r._id, tickTime),
        referenceId: r._id,
        scheduledTime: tickTime,
        title: r.title,
        body: r.description || "Your Vamshi reminder is due.",
        url: "/reminders",
        createInAppNotification: tick === 0 && settings.inApp,
        push: settings.push,
        extra: { alarm: true, tick },
      });
      res.deduped ? counts.deduped++ : (counts.notified += res.notified || 0);
      continue;
    }

    // ----- Single-fire: non-alarm one-offs and repeating reminders -----
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
  const ist = istWallClock(now);
  const todayFestival = await Festival.findOne({
    date: ist.toISOString().slice(0, 10),
  }).lean();
  const broadcasts = systemBroadcastFor(now, todayFestival);
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