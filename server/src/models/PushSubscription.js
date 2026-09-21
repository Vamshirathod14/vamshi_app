import mongoose from "mongoose";

// Web Push subscription for one device/browser. A user may have several
// (iPhone PWA, Android PWA, desktop Chrome…) — each known by its unique
// endpoint. One row per (userId, endpoint), unique-indexed so re-subscribing
// the same device updates in place instead of duplicating.
const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    endpoint: { type: String, required: true, trim: true },
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
    userAgent: { type: String, default: "" },
    deviceName: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

pushSubscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true });
pushSubscriptionSchema.index({ lastUsedAt: 1 });

export const PushSubscription = mongoose.model(
  "PushSubscription",
  pushSubscriptionSchema,
);