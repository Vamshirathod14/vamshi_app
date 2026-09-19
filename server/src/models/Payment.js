import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Razorpay order id — unique per attempt, used to reconcile webhooks and
    // the in-browser verification step idempotently.
    orderId: { type: String, required: true, unique: true },
    // Populated once the payment is captured/verified. Sparse+unique — the
    // field is ABSENT until set, so pending payments never collide on null.
    paymentId: { type: String, unique: true, sparse: true },
    planId: { type: String, required: true },
    planName: { type: String, required: true },
    currency: { type: String, required: true, default: "INR" },
    // All amounts are in paise (integer) and are computed SERVER-SIDE from the
    // authoritative plan price and promo rules — the client never supplies an
    // amount. finalAmount is what was actually charged.
    originalAmount: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true },
    // Promo code applied to this payment (null for full-price / renewals).
    promoCodeId: { type: mongoose.Schema.Types.ObjectId, ref: "PromoCode", default: null },
    promoCode: { type: String, default: null, maxlength: 40 },
    // "checkout" = one-time Razorpay Checkout payment; "subscription" = an
    // automatic renewal charged by a Razorpay subscription.
    mode: { type: String, enum: ["checkout", "subscription"], default: "checkout" },
    // Renewal subscription that will bill subsequent cycles (set after the
    // initial checkout is confirmed).
    subscriptionId: { type: String, default: null },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    // Webhook event identifiers used for idempotency (absent until charged).
    providerEventId: { type: String, unique: true, sparse: true },
    // Set when the payment is confirmed (local time of capture).
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

paymentSchema.index({ userId: 1, createdAt: -1 });

// Milliseconds/GHz: no card numbers, bank details, CVV or such sensitive data
// is ever stored — only what is needed to reconcile a payment.
export const Payment = mongoose.model("Payment", paymentSchema);