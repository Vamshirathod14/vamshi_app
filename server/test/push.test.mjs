import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import webpush from "web-push";

// Point at a throwaway local DB BEFORE the app modules read env.
process.env.MONGODB_URI = "mongodb://localhost:27017/push_test";
process.env.MONGODB_DB = "push_test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-push";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-push";
process.env.CLIENT_ORIGIN = "http://localhost:5173";
process.env.VAPID_PUBLIC_KEY = "BNTsLSOQybBI6n0r7zlP_NEn3dfH5JmzOJFih53hNWvTYodcZK2FJMW8ZI5w96Reyu0SGm-vxkbYo1J8ZWvqhwI";
process.env.VAPID_PRIVATE_KEY = "4_i0gi_o55uN9_vifFx7rVyyzA0NQTF84ryUoz-Zmzg";
process.env.VAPID_SUBJECT = "mailto:test@vamshi.local";

const { createApp } = await import("../src/app.js");
const { default: mongoose } = await import("mongoose");
const { PushSubscription } = await import("../src/models/PushSubscription.js");
const { PushDelivery } = await import("../src/models/PushDelivery.js");
const { Notification } = await import("../src/models/Notification.js");
const { Reminder } = await import("../src/models/Reminder.js");
const { Task } = await import("../src/models/Task.js");
const { scanDueNotifications, computeNextOccurrence, advanceToFuture } =
  await import("../src/services/scheduler.js");
const { connectDb } = await import("../src/config/db.js");

let server;
let base;
let cookiesA = "";
let cookiesB = "";
let sent = [];

function grabCookies(res) {
  return (res.headers.getSetCookie?.() || [])
    .map((c) => c.split(";")[0])
    .join("; ");
}

async function api(path, { method = "GET", body, cookie = cookiesA, ua } = {}) {
  const opts = { method, headers: { Cookie: cookie } };
  if (ua !== undefined) opts.headers["User-Agent"] = ua;
  if (body !== undefined) opts.headers["Content-Type"] = "application/json", (opts.body = JSON.stringify(body));
  const res = await fetch(base + path, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, res };
}

async function register(email, password = "password123") {
  const res = await fetch(base + "/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: email.split("@")[0], email, password }),
  });
  assert.equal(res.status, 201, "register should succeed");
  return grabCookies(res);
}

const EP = (n) => `https://fcm.googleapis.com/fcm/send/device-${n}-${Date.now()}`;
const subBody = () => ({
  endpoint: EP(sent.length),
  keys: { p256dh: "cHVzaC1wMjU2ZGg=", auth: "cHVzaC1hdXRo" },
});

before(async () => {
  await connectDb();
  await mongoose.connection.db.dropDatabase();
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${server.address().port}`;
  cookiesA = await register("push.a@test.dev");
  cookiesB = await register("push.b@test.dev");
  webpush.sendNotification = async () => ({ statusCode: 201 });
});

beforeEach(() => {
  sent = [];
  webpush.sendNotification = async () => ({ statusCode: 201 });
});

after(async () => {
  try {
    await mongoose.connection.db.dropDatabase();
  } finally {
    await mongoose.disconnect();
    await new Promise((r) => server.close(r));
  }
});

// ---------- Auth gating ----------
test("push endpoints require authentication", async () => {
  for (const path of [
    "/api/notifications/push/status",
    "/api/notifications/push/public-key",
    "/api/notifications/push/subscribe",
    "/api/notifications/push/test",
  ]) {
    const { status } = await api(path, { cookie: "" });
    assert.equal(status, 401, `${path} must reject unauthenticated callers`);
  }
});

test("unauthenticated push/subscribe returns 401 (no set-cookie leaks)", async () => {
  const res = await fetch(base + "/api/notifications/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subBody()),
  });
  assert.equal(res.status, 401);
});

// ---------- Public key ----------
test("authenticated user can fetch the VAPID public key", async () => {
  const { status, data } = await api("/api/notifications/push/public-key");
  assert.equal(status, 200);
  assert.ok(data.publicKey);
});

// ---------- Subscribe / duplicates ----------
test("subscribe registers the device (one row per endpoint)", async () => {
  const body = subBody();
  const first = await api("/api/notifications/push/subscribe", { method: "POST", body });
  assert.equal(first.status, 200);
  assert.equal(first.data.enabled, true);

  const dup = await api("/api/notifications/push/subscribe", { method: "POST", body });
  assert.equal(dup.status, 200);
  assert.equal(dup.data.enabled, true);

  const rows = await PushSubscription.countDocuments({
    userId: await userAId(),
    endpoint: body.endpoint,
  });
  assert.equal(rows, 1, "duplicate subscribe must upsert, not duplicate");
});

test("status reflects the subscription", async () => {
  const { status, data } = await api("/api/notifications/push/status");
  assert.equal(status, 200);
  assert.equal(data.enabled, true);
  assert.ok(data.count >= 1);
});

// ---------- Cross-user isolation ----------
test("user B cannot deactivate or see user A's subscription", async () => {
  const aSub = await PushSubscription.findOne({
    userId: await userAId(),
    isActive: true,
  });
  assert.ok(aSub, "A should have an active subscription");

  const res = await api("/api/notifications/push/unsubscribe", {
    method: "DELETE",
    body: { endpoint: aSub.endpoint },
    cookie: cookiesB,
  });
  assert.equal(res.status, 200, "endpoint removed")

  const aAfter = await PushSubscription.findOne({
    userId: await userAId(),
    endpoint: aSub.endpoint,
  });
  assert.equal(aAfter.isActive, true, "B must not deactivate A's device");
  const bCount = await PushSubscription.countDocuments({ userId: await userBId() });
  assert.equal(bCount, 0, "B should have no subscriptions");
});

// ---------- Unsubscribe ----------
test("unsubscribe deactivates the current device", async () => {
  const aSub = await PushSubscription.findOne({
    userId: await userAId(),
    isActive: true,
  });
  const res = await api("/api/notifications/push/unsubscribe", {
    method: "DELETE",
    body: { endpoint: aSub.endpoint },
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.enabled, false);

  const { data } = await api("/api/notifications/push/status");
  assert.equal(data.enabled, false);

  // re-subscribe for the remaining tests
  await api("/api/notifications/push/subscribe", {
    method: "POST",
    body: { endpoint: aSub.endpoint, keys: { p256dh: "cHVzaC1wMjU2ZGg=", auth: "cHVzaC1hdXRo" } },
  });
});

// ---------- Test endpoint (real web-push) ----------
test("push/test sends a real Web Push to every active device", async () => {
  webpush.sendNotification = async () => {
    sent.push(1);
    return { statusCode: 201 };
  };
  const res = await api("/api/notifications/push/test", { method: "POST" });
  assert.equal(res.status, 200);
  assert.ok(res.data.sent >= 1, "test push should be delivered");
  assert.equal(sent.length, res.data.sent);
});

// ---------- 404/410 expiry deactivates only that device ----------
test("expired endpoint (410) deactivates that device only", async () => {
  const active = await PushSubscription.countDocuments({
    userId: await userAId(),
    isActive: true,
  });
  webpush.sendNotification = async () => {
    const err = new Error("gone");
    err.statusCode = 410;
    throw err;
  };
  const res = await api("/api/notifications/push/test", { method: "POST" });
  assert.equal(res.status, 200);
  assert.equal(res.data.failed, active, "all expired devices should be failed");
  const remaining = await PushSubscription.countDocuments({
    userId: await userAId(),
    isActive: true,
  });
  assert.equal(remaining, 0, "410 must deactivate every subscription");

  // Re-arm a subscription for scheduling tests.
  await api("/api/notifications/push/subscribe", {
    method: "POST",
    body: subBody(),
  });
  const rearmed = await PushSubscription.countDocuments({
    userId: await userAId(),
    isActive: true,
  });
  assert.equal(rearmed, 1);
});

// ---------- Multiple devices ----------
test("a second device (distinct user agent) receives its own push", async () => {
  const first = await PushSubscription.findOne({
    userId: await userAId(),
    isActive: true,
  });
  const firstEndpoint = first.endpoint;
  await api("/api/notifications/push/subscribe", {
    method: "POST",
    body: subBody(),
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
  });
  webpush.sendNotification = async () => {
    sent.push(1);
    return { statusCode: 201 };
  };
  const res = await api("/api/notifications/push/test", { method: "POST" });
  assert.equal(res.data.sent, 2, "both devices should receive the push");
  assert.equal(sent.length, 2);
  await PushSubscription.updateOne(
    { userId: await userAId(), isActive: true, endpoint: { $ne: firstEndpoint } },
    { $set: { isActive: false } },
  );
});

// ---------- Same-browser re-registration ----------
test("re-subscribing from the same user agent retires the stale device", async () => {
  // Register twice from the same "browser" (Node fetch UA) with different endpoints.
  await api("/api/notifications/push/subscribe", { method: "POST", body: subBody() });
  await api("/api/notifications/push/subscribe", { method: "POST", body: subBody() });
  const sameUa = await PushSubscription.countDocuments({
    userId: await userAId(),
    userAgent: "node",
    isActive: true,
  });
  assert.equal(sameUa, 1, "only the newest same-browser endpoint stays active");

  // A different device (different UA) still coexists.
  await api("/api/notifications/push/subscribe", {
    method: "POST",
    body: subBody(),
    ua: "Mozilla/5.0 (Linux; Android 14)",
  });
  const total = await PushSubscription.countDocuments({
    userId: await userAId(),
    isActive: true,
  });
  assert.equal(total, 2, "Mac browser + Android device can both be active");
});

// ---------- Scheduler: exactly-one delivery ----------
test("a due reminder notifies exactly once (in-app + device)", async () => {
  const remember = await Reminder.create({
    userId: await userAId(),
    title: "Pay electric bill",
    description: "Due at noon",
    date: new Date(Date.now() - 60 * 1000),
    time: "12:00",
    repeat: "none",
    notificationEnabled: true,
    completed: false,
  });

  webpush.sendNotification = async () => {
    sent.push(1);
    return { statusCode: 201 };
  };

  const first = await scanDueNotifications();
  assert.equal(first.reminders >= 1, true, "sweep should see the reminder");

  // Idempotency is enforced by the unique deliveryKey claim. Calling the
  // claim twice (same reminder, same occurrence) must produce exactly one
  // winner — the second call reports deduped.
  const { deliverScheduledNotification } = await import("../src/services/notifications.js");
  const claimArgs = {
    userId: await userAId(),
    source: "reminder",
    deliveryKey: `reminder:${await userAId()}:${remember._id}:${new Date(remember.date).getTime()}`,
    referenceId: remember._id,
    scheduledTime: remember.date,
    title: "Pay electric bill",
    body: "Due at noon",
    url: "/reminders",
  };
  const winner = await deliverScheduledNotification(claimArgs);
  const loser = await deliverScheduledNotification(claimArgs);
  assert.equal(winner.deduped, true, "key already claimed by the sweep → restart-safe");
  assert.equal(loser.deduped, true, "repeat claim is deduped");

  // Also run two overlapping sweeps — no matter the ordering, only one
  // delivery record may ever exist for this occurrence.
  await Promise.all([scanDueNotifications(), scanDueNotifications()]);

  const deliveries = await PushDelivery.countDocuments({
    userId: await userAId(),
    source: "reminder",
    referenceId: remember._id,
  });
  assert.equal(deliveries, 1, "exactly one delivery record per occurrence");

  const inApp = await Notification.countDocuments({
    userId: await userAId(),
    type: "reminder",
    referenceId: remember._id,
  });
  assert.equal(inApp, 1, "in-app notification must be created");

  const doneReminder = await Reminder.findById(remember._id);
  assert.equal(doneReminder.completed, true, "one-off reminder completes after firing");
});

test("in-app list endpoint exposes the scheduler notification", async () => {
  const { status, data } = await api("/api/notifications");
  assert.equal(status, 200);
  const item = data.notifications.find((n) => n.type === "reminder");
  assert.ok(item, "list should include the reminder notification");
  assert.ok(item.title.includes("electric"));
  assert.ok(item.read === false);
});

// ---------- Task reminders ----------
test("a task reminder is derived from due date/time and fires once", async () => {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dueDate = yesterday.toISOString().slice(0, 10);
  const { status, data } = await api("/api/tasks", {
    method: "POST",
    body: { title: "Submit invoice", dueDate, dueTime: "00:00", reminderEnabled: true },
  });
  assert.equal(status, 201, "task must be accepted");
  const task = data.task;
  assert.ok(task.reminderAt, "server must derive reminderAt");
  assert.equal(task.reminderEnabled, true);

  webpush.sendNotification = async () => {
    sent.push(1);
    return { statusCode: 201 };
  };
  const sweep = await scanDueNotifications();
  assert.equal(sweep.tasks >= 1, true, "sweep should see the task reminder");

  const deliveries = await PushDelivery.countDocuments({
    userId: await userAId(),
    source: "task",
    referenceId: task._id,
  });
  assert.equal(deliveries, 1, "task reminder must deliver exactly once");
  const after = await Task.findById(task._id);
  assert.equal(after.reminderEnabled, false, "task reminder is one-shot");
});

// ---------- Catch-up: old missed one-offs are silently completed ----------
test("days-old missed reminders are not spammed", async () => {
  const old = await Reminder.create({
    userId: await userAId(),
    title: "Ancient reminder",
    date: new Date(Date.now() - 48 * 60 * 60 * 1000),
    time: "08:00",
    repeat: "none",
    notificationEnabled: true,
    completed: false,
  });
  const before = sent.length;
  await scanDueNotifications();
  assert.equal(sent.length, before, "no push for days-old reminders");
  const done = await Reminder.findById(old._id);
  assert.equal(done.completed, true, "old reminder is completed silently");
});

// ---------- Recurrence math ----------
test("computeNextOccurrence preserves wall-clock and handles month-end", () => {
  const daily = computeNextOccurrence(new Date("2026-01-31T10:30:00"), "daily");
  assert.equal(daily.getFullYear(), 2026);
  assert.equal(daily.getMonth(), 1);
  assert.equal(daily.getDate(), 1);
  assert.equal(daily.getHours(), 10, "time-of-day preserved");
  assert.equal(daily.getMinutes(), 30);

  const weekly = computeNextOccurrence(new Date("2026-03-15T18:05:00"), "weekly");
  assert.equal(weekly.getDate(), 22);
  assert.equal(weekly.getHours(), 18);

  const monthly = computeNextOccurrence(new Date("2026-01-31T09:15:00"), "monthly");
  assert.equal(monthly.getDate(), 28, "Jan 31 → Feb 28 (clamped)");
  assert.equal(monthly.getHours(), 9);

  const yearly = computeNextOccurrence(new Date("2024-02-29T12:00:00"), "yearly");
  assert.ok(yearly >= new Date("2025-02-28T12:00:00"), "leap day rolls sensibly");
});

test("advanceToFuture jumps past missed occurrences without flooding", () => {
  const next = advanceToFuture(new Date("2020-01-01T08:00:00"), "daily", new Date("2026-09-21T10:00:00"));
  assert.equal(next.getFullYear(), 2026, "advanced into the future");
  assert.ok(next.getHours() === 8, "kept the intended wall-clock time");
});

// ---------- Recurring reminders deliver then advance ----------
test("recurring reminder: delivers once, then advances to the next occurrence", async () => {
  // A real 09:00 occurrence that is already in the past.
  const due = new Date();
  due.setHours(9, 0, 0, 0);
  if (due > new Date()) due.setDate(due.getDate() - 1);
  const rec = await Reminder.create({
    userId: await userAId(),
    title: "Daily standup",
    date: due,
    time: "09:00",
    repeat: "daily",
    notificationEnabled: true,
    completed: false,
  });
  webpush.sendNotification = async () => {
    sent.push(1);
    return { statusCode: 201 };
  };
  await scanDueNotifications();
  const deliveries = await PushDelivery.countDocuments({
    userId: await userAId(),
    referenceId: rec._id,
  });
  assert.equal(deliveries, 1);
  const after = await Reminder.findById(rec._id);
  assert.equal(after.completed, false, "recurring reminder stays active");
  assert.ok(after.date > new Date(), "next occurrence is in the future");
  assert.equal(after.date.getHours(), 9, "next occurrence keeps 09:00");
  const { date, repeat } = after;
  assert.ok(date, "date preserved");
  assert.equal(repeat, "daily");
});

// ---------- Legacy endpoints stay compatible ----------
test("legacy /subscribe + /unsubscribe still work", async () => {
  const body = subBody();
  const sub = await api("/api/notifications/subscribe", { method: "POST", body });
  assert.equal(sub.status, 200);
  const unsub = await api("/api/notifications/unsubscribe", {
    method: "POST",
    body: { endpoint: body.endpoint },
  });
  assert.equal(unsub.status, 200);
});

// ---------- Regression smoke ----------
test("core read endpoints still respond", async () => {
  for (const path of ["/api/tasks", "/api/reminders", "/api/accounts"]) {
    const { status } = await api(path);
    assert.equal(status, 200, `${path} should be healthy`);
  }
});

// ---------- helpers ----------
let cachedA;
let cachedB;
async function userAId() {
  if (!cachedA) cachedA = await findUser("push.a@test.dev");
  return cachedA;
}
async function userBId() {
  if (!cachedB) cachedB = await findUser("push.b@test.dev");
  return cachedB;
}
async function findUser(email) {
  const { User } = await import("../src/models/User.js");
  const user = await User.findOne({ email });
  assert.ok(user, "expected user to exist");
  return user._id;
}