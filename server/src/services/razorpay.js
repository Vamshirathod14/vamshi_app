import crypto from "node:crypto";
import { env, razorpayConfigured } from "../config/env.js";

const API = "https://api.razorpay.com/v1";

function authHeader() {
  return `Basic ${Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString("base64")}`;
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a), "hex");
  const bb = Buffer.from(String(b || ""), "hex");
  if (ba.length !== bb.length) {
    crypto.timingSafeEqual(ba, ba);
    return false;
  }
  return crypto.timingSafeEqual(ba, bb);
}

async function providerRequest(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `${data?.error?.description || `Razorpay request failed (${res.status})`}`,
    );
  }
  return data;
}

// Create a Razorpay order. Amount is in paise (smallest currency unit).
export async function createOrder({ amountPaise, currency = "INR", receipt, notes }) {
  return providerRequest("POST", "/orders", { amount: amountPaise, currency, receipt, notes });
}

const PLAN_CACHE = new Map();

// Get (or lazily create) the recurring-billing plan for the premium plan at its
// full price (₹99). Renewals always bill the full plan amount — promo codes
// never apply to renewed cycles. When a plan id is supplied in RAZORPAY_PLAN_ID
// that one is reused instead.
export async function getOrCreatePlan({ name, amountPaise, period = "monthly", interval = 1 }) {
  if (env.razorpayPlanId) {
    PLAN_CACHE.set(name, env.razorpayPlanId);
    return env.razorpayPlanId;
  }
  if (PLAN_CACHE.has(name)) return PLAN_CACHE.get(name);

  const plans = await providerRequest("GET", "/plans?count=100");
  const match = (plans?.items || []).find(
    (p) => p?.item?.amount === amountPaise && p.period === period && p.interval === interval,
  );
  const planId = match?.id || null;
  if (planId) {
    PLAN_CACHE.set(name, planId);
    return planId;
  }

  const created = await providerRequest("POST", "/plans", {
    period,
    interval,
    item: { name, amount: amountPaise, currency: "INR", description: name },
  });
  if (created?.id) PLAN_CACHE.set(name, created.id);
  return created?.id || null;
}

// Create a future-starting subscription. The first real charge happens at
// `startAt` (unix seconds) and the plan's full amount is billed per cycle until
// totalCount cycles are exhausted. Payment communication is handled by the
// merchant (us) as customer_notify=0 keeps Razorpay from emailing the user.
export async function createSubscription({
  planId,
  startAt,
  totalCount,
  customerName,
  customerEmail,
  notes,
}) {
  return providerRequest("POST", "/subscriptions", {
    plan_id: planId,
    total_count: totalCount,
    quantity: 1,
    customer_notify: 0,
    start_at: startAt,
    notes,
    notify_info: {
      notify_email: customerEmail ? 1 : 0,
      notify_phone: 0,
    },
    addons: [],
  });
}

// Verify the signature returned by the Razorpay Checkout popup
// (order_id|payment_id signed with the KEY_SECRET).
export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!razorpayConfigured || !signature) return false;
  const expected = crypto
    .createHmac("sha256", env.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return safeEqual(expected, signature);
}

// Verify a webhook payload signed with the WEBHOOK_SECRET. `rawBody` must be the
// exact request body bytes, which is why the webhook route parses it raw.
export function verifyWebhookSignature(rawBody, signature) {
  if (!env.razorpayWebhookSecret || !signature) return false;
  const expected = crypto
    .createHmac("sha256", env.razorpayWebhookSecret)
    .update(rawBody)
    .digest("hex");
  return safeEqual(expected, signature);
}