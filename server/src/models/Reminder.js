import mongoose from "mongoose";

const PRIORITIES = ["high", "medium", "low"];
const REPEAT_TYPES = ["none", "daily", "weekly", "monthly", "yearly"];

const reminderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    date: { type: Date, required: true, index: true },
    time: { type: String, match: /^\d{2}:\d{2}$/, default: null },
    repeat: { type: String, enum: REPEAT_TYPES, default: "none" },
    priority: { type: String, enum: PRIORITIES, default: "medium" },
    notificationEnabled: { type: Boolean, default: true },
    snooze: {
      lastSnoozedAt: { type: Date, default: null },
      times: { type: Number, default: 0 },
    },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

reminderSchema.index({ userId: 1, date: 1 });
reminderSchema.index({ userId: 1, completed: 1 });

export const Reminder = mongoose.model("Reminder", reminderSchema);
export { PRIORITIES, REPEAT_TYPES };