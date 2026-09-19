import mongoose from "mongoose";

// Admin-managed promotional codes. Stored uppercase so lookups are
// case-insensitive and unambiguous. All monetary fields (discountValue for
// "fixed", minimumAmount, maximumDiscount) are in paise — integer math only.
// Discounts apply to a single (the first/next) payment; renewals always bill
// the plan's full price.
const promoSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 40 },
    description: { type: String, default: "", maxlength: 200 },
    discountType: { type: String, enum: ["percentage", "fixed"], default: "percentage" },
    // percentage: 0 < discountValue <= 100. fixed: discountValue in paise.
    discountValue: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    archived: { type: Boolean, default: false },
    // Optional availability window. A null expiryDate means no expiry.
    startDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null },
    // null = unlimited. usedCount is incremented once per confirmed payment.
    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 1 },
    // Optional minimum payable amount (paise) the promo applies to.
    minimumAmount: { type: Number, default: null },
    // Optional cap on the applied discount (paise).
    maximumDiscount: { type: Number, default: null },
    // Plan id this code applies to ("vamshi-premium"), or "*" for any plan.
    appliesToPlan: { type: String, default: "vamshi-premium", maxlength: 60 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

promoSchema.index({ isActive: 1, archived: 1 });

export const PromoCode = mongoose.model("PromoCode", promoSchema);