import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    emoji: { type: String, default: "🎯" },
    color: { type: String, default: "#8b5cf6" },
    targetAmount: {
      type: Number,
      required: true,
      min: [0, "Target cannot be negative"],
      get: (v) => Math.round(v * 100) / 100,
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: [0, "Current cannot be negative"],
      get: (v) => Math.round(v * 100) / 100,
    },
    targetDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    contributions: [
      {
        amount: { type: Number, required: true, get: (v) => Math.round(v * 100) / 100 },
        date: { type: Date, required: true },
        accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
        transactionId: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction", default: null },
        note: { type: String, trim: true, maxlength: 200, default: "" },
        _id: false,
      },
    ],
  },
  { timestamps: true },
);

goalSchema.index({ userId: 1, completedAt: 1 });

export const Goal = mongoose.model("Goal", goalSchema);