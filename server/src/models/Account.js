import mongoose from "mongoose";

const ACCOUNT_TYPES = [
  "bank",
  "cash",
  "upi",
  "credit-card",
  "debit-card",
  "other",
];

const accountSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    type: { type: String, enum: ACCOUNT_TYPES, default: "bank" },
    balance: {
      type: Number,
      default: 0,
      get: (v) => Math.round(v * 100) / 100,
    },
    icon: { type: String, default: null },
    color: { type: String, default: "#6366f1" },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

accountSchema.index({ userId: 1, name: 1 }, { unique: true });

export const Account = mongoose.model("Account", accountSchema);
export { ACCOUNT_TYPES };