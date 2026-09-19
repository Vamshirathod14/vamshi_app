import { getPlan, planOption } from "../config/plans.js";

export const SUBSCRIPTION_STATUSES = ["inactive", "pending", "active", "expired", "cancelled"];

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Mark an "active" subscription as "expired" once its end date passes. This is a
// non-destructive state transition — the user keeps all data and can renew.
// Returns true when the persisted status changed so callers know to save().
export function syncExpiredStatus(user) {
  const end = user.subscriptionEndDate ? new Date(user.subscriptionEndDate) : null;
  if (user.subscriptionStatus === "active" && end && end.getTime() < Date.now()) {
    user.subscriptionStatus = "expired";
    return true;
  }
  return false;
}

export function isActive(user) {
  const changed = syncExpiredStatus(user);
  return !changed && user.subscriptionStatus === "active";
}

// Activate (or renew) a subscription. A renewal extends the current term from
// the existing end date instead of starting a fresh period, so an active user
// never loses time by paying early.
export function activateSubscription(user, { planId, orderId, paymentCustomerId }) {
  const plan = getPlan(planId);
  const now = new Date();
  const currentEnd = user.subscriptionEndDate ? new Date(user.subscriptionEndDate) : null;

  if (user.subscriptionStatus === "active" && currentEnd && currentEnd.getTime() > now.getTime()) {
    user.subscriptionEndDate = addDays(currentEnd, plan.intervalDays);
  } else {
    user.subscriptionStartDate = now;
    user.subscriptionEndDate = addDays(now, plan.intervalDays);
  }
  user.subscriptionStatus = "active";
  user.subscriptionPlanId = plan.id;
  if (orderId) user.subscriptionId = orderId;
  if (paymentCustomerId) user.paymentCustomerId = paymentCustomerId;
  return user;
}

export function subscriptionPayload(user) {
  const status = user.subscriptionStatus;
  const plan = getPlan(user.subscriptionPlanId);
  const end = user.subscriptionEndDate ? new Date(user.subscriptionEndDate) : null;
  const daysLeft =
    status === "active" && end ? Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000)) : 0;
  return {
    status,
    planId: user.subscriptionPlanId || plan.id,
    planName: plan.name,
    price: plan.price,
    currency: plan.currency,
    billingPeriod: plan.billingPeriod,
    startDate: user.subscriptionStartDate || null,
    endDate: user.subscriptionEndDate || null,
    daysLeft,
    option: planOption(),
  };
}

export function generateSubscriptionId() {
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `VAMSHI_SUB_${rnd}`;
}