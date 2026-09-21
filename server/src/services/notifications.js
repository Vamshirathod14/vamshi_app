import webpush from "web-push";
import { env } from "../config/env.js";

// Only the public key is ever sent to browsers. The private key stays on the
// server. Configure in server/.env (npx web-push generate-vapid-keys).
let configured = false;
export function configurePush() {
  if (!env.vapidPublicKey || !env.vapidPrivateKey) return false;
  webpush.setVapidDetails(
    env.vapidSubject,
    env.vapidPublicKey,
    env.vapidPrivateKey,
  );
  configured = true;
  return true;
}

/** Create an in-app Notification row (the Vamshi notification center). */
export async function createInApp(userId, data) {
  const { Notification } = await import("../models/Notification.js");
  return Notification.create({ userId, ...data });
}

/**
 * Atomic, idempotent fan-out of a scheduled notification:
 *  1. claim a unique deliveryKey — if it already exists, skip entirely
 *     (no duplicate in-app rows, no duplicate pushes, safe across restarts
 *     and multiple polling ticks / server instances)
 *  2. create the in-app Notification (requirement 14, both channels)
 *  3. send the Web Push payload to every active subscription
 */
export async function deliverScheduledNotification({
  userId,
  source,
  deliveryKey,
  referenceId = null,
  scheduledTime,
  title,
  body,
  url = "/",
  createInAppNotification = true,
  push = true,
}) {
  const { PushDelivery } = await import("../models/PushDelivery.js");
  let claimed;
  try {
    claimed = await PushDelivery.create({
      deliveryKey,
      userId,
      source,
      referenceId,
      scheduledTime,
      title,
      body,
      url,
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return { deduped: true, notified: 0 };
    }
    throw err;
  }
  const claimedId = claimed._id;

  // In-app channel.
  if (createInAppNotification) {
    try {
      await createInApp(userId, {
        type: notificationTypeFor(source),
        title,
        body,
        referenceId,
        linkTo: url,
      });
    } catch (err) {
      console.error("[push] in-app notification failed:", err.message);
    }
  }

  // Device channel.
  let result = { deduped: false, notified: 0, failed: 0 };
  if (push) {
    result = await pushToDevice(
      userId,
      { type: source, title, body, url, referenceId, deliveryId: claimedId },
    );
  }
  return result;
}

function notificationTypeFor(source) {
  switch (source) {
    case "reminder":
      return "reminder";
    case "task":
      return "task";
    case "recurring":
      return "recurring";
    case "test":
    case "system":
      return "system";
    default:
      return "system";
  }
}

/**
 * Send one Web Push message to every ACTIVE subscription of a user.
 * Permanent failures (404/410 = subscription gone) deactivate only that
 * subscription. Transient failures (429/5xx/network) are left active so the
 * next occurrence can retry.
 */
export async function pushToDevice(userId, data) {
  if (!configured && !configurePush()) {
    return { notified: 0, failed: 0, skipped: "vapid-not-configured" };
  }
  const { PushSubscription } = await import("../models/PushSubscription.js");
  const subs = await PushSubscription.find({ userId, isActive: true });
  if (!subs.length) return { notified: 0, failed: 0 };

  const payload = JSON.stringify(data);
  let notified = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (sub) => {
      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        const res = await webpush.sendNotification(subscription, payload);
        // Recorded as used.
        await PushSubscription.updateOne(
          { _id: sub._id },
          { $set: { lastUsedAt: new Date() } },
        );
        if (res.statusCode >= 200 && res.statusCode < 300) notified++;
        else failed++;
      } catch (err) {
        const status = err?.statusCode;
        if (status === 404 || status === 410) {
          // Endpoint no longer valid — deactivate THIS device only.
          await PushSubscription.updateOne(
            { _id: sub._id },
            { $set: { isActive: false, lastUsedAt: new Date() } },
          );
        }
        failed++;
      }
    }),
  );

  return { notified, failed };
}