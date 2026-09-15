import { Notification } from "../models/Notification.js";
import { asyncHandler, ApiError } from "../middleware/handle.js";
import { SessionToken } from "../models/Token.js";

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

export const pushSubscribe = asyncHandler(async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.auth || !keys?.p256dh) {
    throw new ApiError(400, "Invalid push subscription.");
  }
  const subscription = { endpoint, keys };
  const exists = req.user.pushSubscriptions.some(
    (s) => s.endpoint === endpoint,
  );
  if (!exists) {
    req.user.pushSubscriptions.push(subscription);
    await req.user.save();
  }
  return res.json({ message: "Push subscription registered." });
});

export const pushUnsubscribe = asyncHandler(async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) throw new ApiError(400, "Endpoint required.");
  req.user.pushSubscriptions = (req.user.pushSubscriptions || []).filter(
    (s) => s.endpoint !== endpoint,
  );
  await req.user.save();
  return res.json({ message: "Push subscription removed." });
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