import { z } from "zod";
import { Notification } from "../models/Notification.js";
import { PushSubscription } from "../models/PushSubscription.js";
import { pushToDevice, configurePush } from "../services/notifications.js";
import { env, vapidConfigured } from "../config/env.js";
import { asyncHandler, ApiError } from "../middleware/handle.js";
import { SessionToken } from "../models/Token.js";

const subSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    auth: z.string().min(1).max(512),
    p256dh: z.string().min(1).max(1024),
  }),
});

export const list = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ deliveredAt: -1 })
    .limit(100);
  const unread = await Notification.countDocuments({ userId: req.user._id, read: false });
  return res.json({ notifications, unread });
});

export const markRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, read: false },
    { $set: { read: true } },
  );
  return res.json({ message: "All notifications marked as read." });
});

export const markOneRead = asyncHandler(async (req, res) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { read: true } },
    { new: true },
  );
  if (!notif) throw new ApiError(404, "Notification not found.");
  return res.json({ notification: notif });
});

export const remove = asyncHandler(async (req, res) => {
  await Notification.deleteOne({ _id: req.params.id, userId: req.user._id });
  return res.json({ message: "Notification removed." });
});

// ---------------- Web Push endpoints ----------------

export const pushPublicKey = asyncHandler(async (req, res) => {
  if (!vapidConfigured) {
    throw new ApiError(
      503,
      "Push notifications are not configured on this server yet.",
      null,
      "PUSH_NOT_CONFIGURED",
    );
  }
  return res.json({ publicKey: env.vapidPublicKey });
});

export const pushStatus = asyncHandler(async (req, res) => {
  const count = await PushSubscription.countDocuments({
    userId: req.user._id,
    isActive: true,
  });
  return res.json({ enabled: count > 0, count });
});

/** Register / refresh THIS device's push subscription (idempotent). */
export const pushSubscribe = asyncHandler(async (req, res) => {
  const { data, error } = subSchema.safeParse(req.body);
  if (!data) throw new ApiError(400, "Invalid push subscription.", error?.issues);

  const userId = req.user._id;
  const { endpoint, keys } = data;
  const userAgent = req.headers["user-agent"]?.slice(0, 300) || "";
  const fields = {
    p256dh: keys.p256dh,
    auth: keys.auth,
    userAgent,
    isActive: true,
    lastUsedAt: new Date(),
  };

  try {
    await PushSubscription.create({ userId, endpoint, ...fields });
  } catch (err) {
    // Unique (userId, endpoint) exists → reactivate / refresh that device only.
    if (err?.code === 11000) {
      await PushSubscription.updateOne(
        { userId, endpoint },
        { $set: fields },
      );
    } else {
      throw err;
    }
  }

  // A browser holds ONE live Web Push subscription per registration. When the
  // same browser endpoint changes (re-subscribe), push services invalidate the
  // old one — leaving stale rows that fail with 404/410 on every send. Deactivate
  // other active subscriptions from the SAME user agent so they don't become
  // zombie devices (distinct devices with different user agents stay untouched).
  await PushSubscription.updateMany(
    { userId, endpoint: { $ne: endpoint }, userAgent, isActive: true },
    { $set: { isActive: false } },
  );

  return res.json({ message: "Push notifications enabled.", enabled: true });
});

/** Deactivate THIS device's subscription. */
export const pushUnsubscribe = asyncHandler(async (req, res) => {
  const { endpoint } = req.body || {};
  if (!endpoint) throw new ApiError(400, "Endpoint required.");

  await PushSubscription.updateOne(
    { userId: req.user._id, endpoint },
    { $set: { isActive: false } },
  );
  return res.json({ message: "Push notifications disabled on this device.", enabled: false });
});

/**
 * Diagnostic: send one REAL Web Push to every active device of the user.
 * No fake reminders, no fake scheduled events — just a push.
 */
export const pushTest = asyncHandler(async (req, res) => {
  if (!configurePush()) {
    throw new ApiError(
      503,
      "Push notifications are not configured on this server yet.",
      null,
      "PUSH_NOT_CONFIGURED",
    );
  }
  const result = await pushToDevice(req.user._id, {
    type: "test",
    title: "Vamshi Notifications",
    body: "Push notifications are working correctly.",
    url: "/",
  });
  if (result.skipped) {
    throw new ApiError(
      503,
      "Push notifications are not configured on this server yet.",
      null,
      "PUSH_NOT_CONFIGURED",
    );
  }
  return res.json({
    message:
      result.failed > 0
        ? `Sent to ${result.notified} device(s), ${result.failed} failed.`
        : "Test notification sent.",
    sent: result.notified,
    failed: result.failed,
  });
});

export const clearSessions = asyncHandler(async (req, res) => {
  const current = req.cookies?.accessToken
    ? (await import("jsonwebtoken")).default.verify(
        req.cookies.accessToken,
        process.env.JWT_ACCESS_SECRET,
      )
    : null;
  await SessionToken.updateMany(
    { userId: req.user._id, jti: { $ne: current?.jti } },
    { $set: { revokedAt: new Date() } },
  );
  return res.json({ message: "All other sessions cleared." });
});