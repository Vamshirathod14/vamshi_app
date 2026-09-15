import webpush from "web-push";

export async function createNotification(userId, data) {
  const { Notification } = await import("../models/Notification.js");
  return Notification.create({ userId, ...data });
}

export async function pushToDevice(user, data) {
  const subs = user.pushSubscriptions || [];
  if (!subs.length) return;
  const results = [];
  for (const sub of subs) {
    try {
      const res = await webpush.sendNotification(sub, JSON.stringify({ ...data }));
      results.push({ ok: res.statusCode >= 200 && res.statusCode < 300 });
    } catch (err) {
      results.push({ ok: false, error: err.message });
    }
  }
  return results;
}