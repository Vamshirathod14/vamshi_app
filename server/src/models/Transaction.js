import mongoose from "mongoose";

export const PAYMENT_METHODS = [
  "upi",
  "cash",
  "credit-card",
  "debit-card",
  "bank-transfer",
  "other",
];

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["expense", "income", "transfer", "savings"], required: true, index: true },
    amount: {
      type: Number,
      required: true,
      min: [0, "Amount cannot be negative"],
      get: (v) => Math.round(v * 100) / 100,
    },

    // expense
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: "other" },

    // income
    source: { type: String, trim: true, maxlength: 60, default: null },

    // transfer
    fromAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
    toAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },

    // savings (goal contribution) – debits account, not counted as expense/income
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: "Goal", default: null },

    // common
    description: { type: String, trim: true, maxlength: 200, default: "" },
    note: { type: String, trim: true, maxlength: 1000, default: "" },
    date: { type: Date, required: true, index: true },
    recurringId: { type: mongoose.Schema.Types.ObjectId, ref: "RecurringTransaction", default: null },
    receiptId: { type: mongoose.Schema.Types.ObjectId, ref: "Receipt", default: null },
  },
  { timestamps: true },
);

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });
transactionSchema.index({ userId: 1, categoryId: 1, date: -1 });
transactionSchema.index({ userId: 1, accountId: 1, date: -1 });

export const Transaction = mongoose.model("Transaction", transactionSchema);