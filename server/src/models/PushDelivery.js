import mongoose from "mongoose";

// Idempotency ledger for scheduled notifications. The unique deliveryKey
// (userId + referenceId + occurrenceTimestamp) guarantees a reminder/task can
// only ever generate ONE notification/occurrence, even if the scheduler runs
// twice, the server restarts mid-flight, or multiple instances race.
const pushDeliverySchema = new mongoose.Schema(
  {
    deliveryKey: { type: String, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["reminder", "task", "recurring", "test", "system"],
      required: true,
    },
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    scheduledTime: { type: Date, required: true },
    title: { type: String, default: "" },
    body: { type: String, default: "" },
    url: { type: String, default: "/" },
    deliveredAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

pushDeliverySchema.index({ deliveryKey: 1 }, { unique: true });
pushDeliverySchema.index({ userId: 1, deliveredAt: -1 });

export const PushDelivery = mongoose.model("PushDelivery", pushDeliverySchema);