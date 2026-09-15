import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    dueDate: { type: Date, default: null, index: true },
    dueTime: { type: String, match: /^\d{2}:\d{2}$/, default: null },
    priority: { type: String, enum: ["high", "medium", "low"], default: "medium" },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    reminderEnabled: { type: Boolean, default: false },
    reminderAt: { type: Date, default: null },
    repeat: {
      type: String,
      enum: ["none", "daily", "weekly", "monthly"],
      default: "none",
    },
    noteId: { type: mongoose.Schema.Types.ObjectId, ref: "Note", default: null },
    source: { type: String, default: null },
  },
  { timestamps: true },
);

taskSchema.index({ userId: 1, completed: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });

export const Task = mongoose.model("Task", taskSchema);