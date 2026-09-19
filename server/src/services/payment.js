import { env, razorpayConfigured } from "../config/env.js";
import { getPlan } from "../config/plans.js";
import { activateSubscription } from "./subscription.js";
import { createSubscription, getOrCreatePlan } from "./razorpay.js";
import { consumePromoUsage } from "./promo.js";

// Renewal billing starts right at the end of the current paid term (at least
// one hour out, so the subscription request is always in the future).
function renewalStartSeconds(user) {
  const safe = Math.floor(Date.now() / 1000) + 3600;
  const end = user.subscriptionEndDate
    ? Math.floor(new Date(user.subscriptionEndDate).getTime() / 1000)
    : 0;
  return Math.max(safe, end);
}

// Authoritative confirmation that a payment is paid. Idempotent: called from
// both the in-browser verify step (after signature check) and the payment
// webhook. Only the first call performs the state transition + promo
// consumption.
export async function confirmPaidPayment({ user, payment, razorpayPaymentId }) {
  if (payment.status === "paid") return false;

  payment.status = "paid";
  if (razorpayPaymentId) payment.paymentId = razorpayPaymentId;
  payment.paidAt = new Date();
  await payment.save();

  activateSubscription(user, { planId: payment.planId });
  await user.save();

  if (payment.promoCodeId) await consumePromoUsage({ user, payment });
  await scheduleRenewalSubscription({ user, payment });

  await user.save();
  await payment.save();
  return true;
}

// Schedule the automatic renewal subscription at full plan price. Best-effort:
// if the provider is unavailable the user keeps the paid term and the renewal
// can be retried manually — access is never granted twice or lost.
export async function scheduleRenewalSubscription({ user, payment }) {
  if (!razorpayConfigured || payment.subscriptionId) return null;

  try {
    const plan = getPlan(payment.planId);
    const planId = await getOrCreatePlan({
      name: plan.name,
      amountPaise: plan.amountPaise,
      period: "monthly",
      interval: 1,
    });
    if (!planId) return null;

    const subscription = await createSubscription({
      planId,
      startAt: renewalStartSeconds(user),
      totalCount: env.razorpaySubscriptionCycles,
      customerName: user.name,
      customerEmail: user.email,
      notes: { userId: String(user._id), planId: plan.id },
    });

    payment.subscriptionId = subscription.id;
    user.subscriptionId = subscription.id;
    return subscription;
  } catch (err) {
    console.warn("[payment] Could not schedule renewal subscription:", err.message);
    return null;
  }
}

// Safe subset of a Payment for API responses (no internals, integer paise).
export function paymentSummary(p) {
  return {
    id: p._id,
    orderId: p.orderId,
    paymentId: p.paymentId,
    planId: p.planId,
    planName: p.planName,
    originalAmount: p.originalAmount,
    discountAmount: p.discountAmount,
    finalAmount: p.finalAmount,
    promoCode: p.promoCode,
    currency: p.currency,
    status: p.status,
    mode: p.mode,
    subscriptionId: p.subscriptionId,
    createdAt: p.createdAt,
    paidAt: p.paidAt,
  };
}