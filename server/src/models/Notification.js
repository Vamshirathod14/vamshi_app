import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: [
        "task",
        "reminder",
        "payment",
        "recurring",
        "budget",
        "goal",
        "summary",
        "system",
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, trim: true, maxlength: 1000, default: "" },
    severity: { type: String, enum: ["info", "warning", "critical"], default: "info" },
    linkTo: { type: String, default: null },
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    read: { type: Boolean, default: false },
    deliveredAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, read: 1, deliveredAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);