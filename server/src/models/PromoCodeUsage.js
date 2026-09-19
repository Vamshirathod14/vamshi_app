import mongoose from "mongoose";

// One row per confirmed payment that used a promo code. The unique
// (promoCodeId, userId, paymentId) constraint guarantees a code is consumed at
// most once per payment, so replayed webhooks / verify calls can never double
// count usage. Rows are created ONLY after a payment is confirmed as paid.
const usageSchema = new mongoose.Schema(
  {
    promoCodeId: { type: mongoose.Schema.Types.ObjectId, ref: "PromoCode", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true },
    subscriptionId: { type: String, default: null },
    // All amounts in paise (integer).
    originalAmount: { type: Number, required: true },
    discountAmount: { type: Number, required: true },
    finalAmount: { type: Number, required: true },
    usedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

usageSchema.index({ promoCodeId: 1, userId: 1, paymentId: 1 }, { unique: true });
usageSchema.index({ userId: 1, createdAt: -1 });

export const PromoCodeUsage = mongoose.model("PromoCodeUsage", usageSchema);