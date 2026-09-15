import mongoose from "mongoose";

const recurringSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["expense", "income"], default: "expense" },
    amount: {
      type: Number,
      required: true,
      min: [0, "Amount cannot be negative"],
      get: (v) => Math.round(v * 100) / 100,
    },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
    paymentMethod: { type: String, default: "other" },
    source: { type: String, trim: true, maxlength: 60, default: null },
    description: { type: String, trim: true, maxlength: 200, default: "" },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly", "custom"],
      default: "monthly",
    },
    interval: { type: Number, default: 1, min: 1 },
    customDaysOfWeek: { type: [Number], default: [] },
    customDayOfMonth: { type: Number, default: null, min: 1, max: 31 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    active: { type: Boolean, default: true },
    lastGeneratedDate: { type: Date, default: null },
    nextRunDate: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

recurringSchema.index({ userId: 1, active: 1, nextRunDate: 1 });

export const RecurringTransaction = mongoose.model(
  "RecurringTransaction",
  recurringSchema,
);