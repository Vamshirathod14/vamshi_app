import { ApiError } from "../middleware/handle.js";
import { PromoCode } from "../models/PromoCode.js";
import { PromoCodeUsage } from "../models/PromoCodeUsage.js";
import { getPlan } from "../config/plans.js";

// Minimum payment Razorpay accepts for INR (₹1). We never let a discount push
// the payable amount below this floor — matching the provider's own rule.
export const MINIMUM_REALISABLE = 100;

// Human-friendly messages mapping to the security-test categories. The client
// maps code -> message; the server message is authoritative.
export const PROMO_ERROR_MESSAGES = {
  INVALID: "This promo code is invalid.",
  NOT_ACTIVE: "This promo code is not active.",
  NOT_STARTED: "This promo code is not active yet.",
  EXPIRED: "This promo code has expired.",
  LIMIT_REACHED: "This promo code is no longer available.",
  ALREADY_USED: "You have already used this promo code.",
  WRONG_PLAN: "This promo code does not apply to this plan.",
  MINIMUM_NOT_MET: "This promo code does not apply to the selected amount.",
};

export function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

// Integer (paise) arithmetic. Returns { discountPaise, finalPaise }.
export function computeDiscount({ promo, originalPaise }) {
  let discountPaise;
  if (promo.discountType === "fixed") {
    discountPaise = Math.floor(Number(promo.discountValue) || 0);
  } else {
    discountPaise = Math.round((originalPaise * Number(promo.discountValue)) / 100);
  }
  if (Number.isFinite(promo.maximumDiscount) && promo.maximumDiscount > 0) {
    discountPaise = Math.min(discountPaise, Math.floor(promo.maximumDiscount));
  }
  // Never exceed the amount; always leave at least the minimum realisable.
  discountPaise = Math.min(discountPaise, originalPaise - MINIMUM_REALISABLE);
  const finalPaise = originalPaise - discountPaise;
  return { discountPaise, finalPaise };
}

// Full server-side validation of a promo code for a user + plan. Throws
// ApiError(400, message, undefined, code) so the frontend can map the code. The
// consumed-usage check is against persisted usage rows, so "already used" is
// accurate even across order retries. Does NOT mutate anything.
export async function validatePromoForUser({ code, userId, planId }) {
  const normalized = normalizeCode(code);

  const promo = await PromoCode.findOne({ code: normalized });
  if (!promo || promo.archived) {
    throw new ApiError(400, PROMO_ERROR_MESSAGES.INVALID, undefined, "INVALID");
  }
  if (!promo.isActive) {
    throw new ApiError(400, PROMO_ERROR_MESSAGES.NOT_ACTIVE, undefined, "NOT_ACTIVE");
  }
  const now = Date.now();
  if (promo.startDate && new Date(promo.startDate).getTime() > now) {
    throw new ApiError(400, PROMO_ERROR_MESSAGES.NOT_STARTED, undefined, "NOT_STARTED");
  }
  if (promo.expiryDate && new Date(promo.expiryDate).getTime() < now) {
    throw new ApiError(400, PROMO_ERROR_MESSAGES.EXPIRED, undefined, "EXPIRED");
  }
  if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) {
    throw new ApiError(400, PROMO_ERROR_MESSAGES.LIMIT_REACHED, undefined, "LIMIT_REACHED");
  }

  const usedByUser = await PromoCodeUsage.countDocuments({
    promoCodeId: promo._id,
    userId,
  });
  if (usedByUser >= (promo.perUserLimit ?? 1)) {
    throw new ApiError(400, PROMO_ERROR_MESSAGES.ALREADY_USED, undefined, "ALREADY_USED");
  }

  if (promo.appliesToPlan && promo.appliesToPlan !== "*" && promo.appliesToPlan !== planId) {
    throw new ApiError(400, PROMO_ERROR_MESSAGES.WRONG_PLAN, undefined, "WRONG_PLAN");
  }

  const plan = getPlan(planId);
  const originalPaise = plan.amountPaise;
  if (promo.minimumAmount != null && originalPaise < promo.minimumAmount) {
    throw new ApiError(400, PROMO_ERROR_MESSAGES.MINIMUM_NOT_MET, undefined, "MINIMUM_NOT_MET");
  }

  const { discountPaise, finalPaise } = computeDiscount({ promo, originalPaise });

  return { promo, originalPaise, discountPaise, finalPaise };
}

// Record a promo usage AFTER the payment is confirmed. Idempotent — a second
// call for the same (promo, user, payment) is a no-op, and the unique index
// backs this up under concurrent webhook/verify races. Returns true when a new
// usage was consumed.
export async function consumePromoUsage({ user, payment }) {
  if (!payment?.promoCodeId) return false;
  const exists = await PromoCodeUsage.findOne({
    promoCodeId: payment.promoCodeId,
    userId: user._id,
    paymentId: payment._id,
  });
  if (exists) return false;

  try {
    await PromoCodeUsage.create({
      promoCodeId: payment.promoCodeId,
      userId: user._id,
      paymentId: payment._id,
      subscriptionId: payment.subscriptionId || null,
      originalAmount: payment.originalAmount,
      discountAmount: payment.discountAmount,
      finalAmount: payment.finalAmount,
    });
  } catch (err) {
    if (err?.code === 11000) return false; // already consumed
    throw err;
  }

  await PromoCode.updateOne(
    { _id: payment.promoCodeId },
    { $inc: { usedCount: 1 } },
  );
  return true;
}