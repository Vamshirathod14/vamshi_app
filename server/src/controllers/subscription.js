import { z } from "zod";
import { ApiError, asyncHandler } from "../middleware/handle.js";
import { Payment } from "../models/Payment.js";
import { env, razorpayConfigured } from "../config/env.js";
import { getPlan, planOption } from "../config/plans.js";
import {
  subscriptionPayload,
  syncExpiredStatus,
} from "../services/subscription.js";
import { createOrder, verifyPaymentSignature } from "../services/razorpay.js";
import { validatePromoForUser } from "../services/promo.js";
import {
  confirmPaidPayment,
  paymentSummary,
} from "../services/payment.js";

// Info the Subscription page needs to render (and to boot the Razorpay
// Checkout). Only the public key id is ever sent to the client; the mode is
// informational (the client can never choose a payment mode).
export const config = asyncHandler(async (_req, res) => {
  return res.json({
    provider: "razorpay",
    configured: razorpayConfigured,
    keyId: razorpayConfigured ? env.razorpayKeyId : null,
    mode: env.paymentMode,
    plan: planOption(),
  });
});

export const summary = asyncHandler(async (req, res) => {
  const changed = syncExpiredStatus(req.user);
  if (changed) await req.user.save();
  return res.json({ subscription: subscriptionPayload(req.user) });
});

export const history = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);
  return res.json({ payments: payments.map(paymentSummary) });
});

const promoValidateSchema = z.object({
  code: z.string().min(1).max(60),
  planId: z.string().max(60).optional(),
});

// Server-side promo validation in isolation — returns the exact amounts the
// server WILL charge. The client renders these, but the /order endpoint
// re-validates everything and computes the final amount itself.
export const validatePromo = asyncHandler(async (req, res) => {
  const { code, planId } = promoValidateSchema.parse(req.body || {});
  const plan = getPlan(planId);
  const { promo, originalPaise, discountPaise, finalPaise } = await validatePromoForUser({
    code,
    userId: req.user._id,
    planId: plan.id,
  });
  return res.json({
    code: promo.code,
    description: promo.description,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
    currency: plan.currency,
    originalAmount: originalPaise,
    discountAmount: discountPaise,
    finalAmount: finalPaise,
  });
});

const orderSchema = z.object({
  planId: z.string().max(60).optional(),
  promoCode: z.string().max(60).optional(),
});

// Create a Razorpay order for the SERVER-computed amount. The only inputs
// accepted from the client are planId + optional promoCode; the amount (and
// any discount) is derived entirely from server-side plan pricing and promo
// rules — a tampered amount is impossible because none is ever accepted.
export const startCheckout = asyncHandler(async (req, res) => {
  if (!razorpayConfigured) {
    throw new ApiError(503, "Payments are not configured yet. Please try again later.");
  }
  const { planId, promoCode } = orderSchema.parse(req.body || {});
  const plan = getPlan(planId);

  const originalPaise = plan.amountPaise;
  let discountPaise = 0;
  let promo = null;
  if (promoCode && promoCode.trim()) {
    const validated = await validatePromoForUser({
      code: promoCode,
      userId: req.user._id,
      planId: plan.id,
    });
    promo = validated.promo;
    discountPaise = validated.discountPaise;
  }
  const finalPaise = originalPaise - discountPaise;

  const order = await createOrder({
    amountPaise: finalPaise,
    currency: plan.currency,
    receipt: `sub_${req.user._id.toString().slice(-12)}_${Date.now()}`,
    notes: {
      userId: req.user._id.toString(),
      planId: plan.id,
      planName: plan.name,
      promoCode: promo?.code || "",
    },
  });

  await Payment.create({
    userId: req.user._id,
    orderId: order.id,
    planId: plan.id,
    planName: plan.name,
    currency: plan.currency,
    originalAmount: originalPaise,
    discountAmount: discountPaise,
    finalAmount: finalPaise,
    promoCodeId: promo?._id || null,
    promoCode: promo?.code || null,
    status: "pending",
    mode: "checkout",
  });

  if (req.user.subscriptionStatus === "inactive") {
    req.user.subscriptionStatus = "pending";
    await req.user.save();
  }

  return res.json({
    order: { id: order.id, amountPaise: finalPaise, currency: order.currency },
    keyId: env.razorpayKeyId,
    mode: env.paymentMode,
    plan: planOption(),
    summary: {
      originalAmount: originalPaise,
      discountAmount: discountPaise,
      finalAmount: finalPaise,
      currency: plan.currency,
      promoCode: promo?.code || null,
      nextRenewalAmount: plan.amountPaise,
    },
  });
});

const verifySchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

// Backend verification of the Checkout popup result. The signature is checked
// server-side with the KEY_SECRET; a bad signature is rejected outright — there
// is no fake-success path. On success the subscription activates and the promo
// usage is consumed exactly once (idempotent).
export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = verifySchema.parse(
    req.body,
  );

  const valid = verifyPaymentSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });
  if (!valid) {
    throw new ApiError(400, "Payment verification failed. Please contact support.");
  }

  const payment = await Payment.findOne({
    orderId: razorpay_order_id,
    userId: req.user._id,
  });
  if (!payment) throw new ApiError(404, "No matching payment was found for this order.");

  await confirmPaidPayment({ user: req.user, payment, razorpayPaymentId: razorpay_payment_id });

  return res.json({
    user: req.user.toSafe(),
    subscription: subscriptionPayload(req.user),
    payment: paymentSummary(payment),
  });
});