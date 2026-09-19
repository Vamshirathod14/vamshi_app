import { Payment } from "../models/Payment.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../middleware/handle.js";
import { getPlan } from "../config/plans.js";
import { verifyWebhookSignature } from "../services/razorpay.js";
import { activateSubscription } from "../services/subscription.js";
import { confirmPaidPayment } from "../services/payment.js";

// Razorpay hits this endpoint with a signed JSON payload. The raw body is
// required for signature verification, so this route is mounted with
// express.raw() in app.js (before express.json()).
export const razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.get("x-razorpay-signature");
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body || "");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return res.status(400).json({ message: "Invalid webhook signature." });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ message: "Invalid payload." });
  }

  const name = event?.event || "";

  if (name === "payment.captured") {
    await handlePaymentCaptured(event);
  } else if (name === "payment.failed") {
    await handlePaymentFailed(event);
  } else if (name === "subscription.charged") {
    await handleSubscriptionCharged(event);
  } else if (
    ["subscription.activated", "subscription.cancelled", "subscription.halted", "subscription.expired", "subscription.completed"].includes(name)
  ) {
    await handleSubscriptionLifecycle(name, event);
  }
  // Unrecognised / informational events (order.pending, payment.authorized,
  // subscription.created, ...) are acknowledged without state changes.

  return res.json({ received: true });
});

// Initial checkout captured. Reconciles to the local Payment by order id or
// provider payment id and confirms it exactly once (idempotent thanks to the
// paid check + promo usage's unique index).
async function handlePaymentCaptured(event) {
  const entity = event?.payload?.payment?.entity || {};
  const razorpayPaymentId = entity.id;
  const orderId = entity.order_id;
  if (!orderId || !razorpayPaymentId) return;

  const payment = await Payment.findOne({
    $or: [{ orderId }, { paymentId: razorpayPaymentId }],
  });
  if (!payment) return;

  const user = await User.findById(payment.userId);
  if (!user) return;

  await confirmPaidPayment({ user, payment, razorpayPaymentId });
}

async function handlePaymentFailed(event) {
  const { order_id: orderId } = event?.payload?.payment?.entity || {};
  if (!orderId) return;
  const payment = await Payment.findOne({ orderId });
  if (!payment || payment.status === "paid") return;
  payment.status = "failed";
  await payment.save();
}

async function handleSubscriptionCharged(event) {
  const subscriptionEntity = event?.payload?.subscription?.entity || {};
  const paymentEntity = event?.payload?.payment?.entity || {};
  const subscriptionId = subscriptionEntity.id || paymentEntity.subscription_id;
  const razorpayPaymentId = paymentEntity.id;
  if (!subscriptionId) return;

  // The owner of this subscription is the user we stored subscriptionId on.
  const user = await User.findOne({ subscriptionId });
  if (!user) return;

  const eventId = `subscription.charged:${razorpayPaymentId || subscriptionId}`;
  const alreadyHandled = await Payment.findOne({ providerEventId: eventId });
  if (alreadyHandled) return;

  const plan = getPlan(user.subscriptionPlanId);

  try {
    await Payment.create({
      userId: user._id,
      orderId: paymentEntity.order_id || `rzp_sbn_${subscriptionId}_${Date.now()}`,
      paymentId: razorpayPaymentId || undefined,
      planId: plan.id,
      planName: plan.name,
      originalAmount: plan.amountPaise,
      discountAmount: 0,
      finalAmount: plan.amountPaise,
      currency: plan.currency,
      status: "paid",
      mode: "subscription",
      subscriptionId,
      providerEventId: eventId,
      paidAt: new Date(),
    });
  } catch (err) {
    if (err?.code === 11000) return; // duplicate webhook replay
    throw err;
  }

  // Extend the paid term by one billing period (renewal).
  activateSubscription(user, { planId: plan.id });
  await user.save();
}

async function handleSubscriptionLifecycle(name, event) {
  const subscriptionEntity = event?.payload?.subscription?.entity || {};
  const { id: subscriptionId } = subscriptionEntity;
  if (!subscriptionId) return;

  const user = await User.findOne({ subscriptionId });
  if (!user) return;

  if (name === "subscription.activated") {
    user.subscriptionStatus = "active";
  } else if (name === "subscription.cancelled" || name === "subscription.halted") {
    if (user.subscriptionStatus !== "cancelled") user.subscriptionStatus = "cancelled";
  } else if (name === "subscription.expired" || name === "subscription.completed") {
    if (user.subscriptionStatus === "active") user.subscriptionStatus = "expired";
  }
  await user.save();
}