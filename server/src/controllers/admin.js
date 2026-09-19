import { z } from "zod";
import { User } from "../models/User.js";
import { Payment } from "../models/Payment.js";
import { PromoCode } from "../models/PromoCode.js";
import { PromoCodeUsage } from "../models/PromoCodeUsage.js";
import { ApiError, asyncHandler } from "../middleware/handle.js";
import { normalizeCode } from "../services/promo.js";

// Server-side admin analytics. Guards live in routes/admin.js (protect +
// requireAdmin), so this data is never exposed to regular users.
export const stats = asyncHandler(async (_req, res) => {
  const [
    totalUsers,
    activeSubscriptions,
    pendingCount,
    inactiveCount,
    expiredCount,
    cancelledCount,
    revenueAgg,
    recentRegistrations,
    recentPayments,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ subscriptionStatus: "active" }),
    User.countDocuments({ subscriptionStatus: "pending" }),
    User.countDocuments({ subscriptionStatus: "inactive" }),
    User.countDocuments({ subscriptionStatus: "expired" }),
    User.countDocuments({ subscriptionStatus: "cancelled" }),
    Payment.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$finalAmount" } } },
    ]),
    User.find().sort({ createdAt: -1 }).limit(8).select("name email role subscriptionStatus createdAt"),
    Payment.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("userId", "name email")
      .select("planName originalAmount discountAmount finalAmount promoCode currency status createdAt paidAt"),
  ]);

  const payments = recentPayments.map((p) => ({
    id: p._id,
    user: p.userId ? { id: p.userId._id, name: p.userId.name, email: p.userId.email } : null,
    planName: p.planName,
    originalAmount: p.originalAmount,
    discountAmount: p.discountAmount,
    finalAmount: p.finalAmount,
    promoCode: p.promoCode,
    currency: p.currency,
    status: p.status,
    createdAt: p.createdAt,
  }));

  return res.json({
    totalUsers,
    activeSubscriptions,
    pendingCount,
    inactiveCount,
    expiredCount,
    cancelledCount,
    // revenue is in paise (integer) — the client formats it.
    revenue: revenueAgg[0]?.total || 0,
    recentRegistrations,
    recentPayments: payments,
  });
});

const promoCodeSchema = z.object({
  code: z.string().min(2).max(40),
  description: z.string().max(200).optional().default(""),
  discountType: z.enum(["percentage", "fixed"]).optional().default("percentage"),
  discountValue: z.number().positive(),
  isActive: z.boolean().optional().default(true),
  startDate: z.string().datetime().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  perUserLimit: z.number().int().positive().optional().default(1),
  // Paise.
  minimumAmount: z.number().int().positive().optional().nullable(),
  maximumDiscount: z.number().int().positive().optional().nullable(),
  appliesToPlan: z.string().max(60).optional().default("vamshi-premium"),
});

function assertValidDiscount(discountType, discountValue) {
  if (discountType === "percentage" && (discountValue <= 0 || discountValue > 100)) {
    throw new ApiError(400, "A percentage discount must be between 1 and 100.");
  }
  if (discountType === "fixed" && discountValue < 1) {
    throw new ApiError(400, "A fixed discount must be at least ₹0.01.");
  }
}

function toAdminJSON(code) {
  return {
    id: code._id,
    code: code.code,
    description: code.description,
    discountType: code.discountType,
    discountValue: code.discountValue,
    isActive: code.isActive,
    archived: code.archived,
    startDate: code.startDate,
    expiryDate: code.expiryDate,
    usageLimit: code.usageLimit,
    usedCount: code.usedCount,
    perUserLimit: code.perUserLimit,
    minimumAmount: code.minimumAmount,
    maximumDiscount: code.maximumDiscount,
    appliesToPlan: code.appliesToPlan,
    createdAt: code.createdAt,
    updatedAt: code.updatedAt,
  };
}

export const listPromoCodes = asyncHandler(async (_req, res) => {
  const codes = await PromoCode.find()
    .sort({ createdAt: -1 })
    .limit(200);
  return res.json({ promoCodes: codes.map(toAdminJSON) });
});

export const createPromoCode = asyncHandler(async (req, res) => {
  const data = promoCodeSchema.parse(req.body || {});
  assertValidDiscount(data.discountType, data.discountValue);

  const code = normalizeCode(data.code);
  const existing = await PromoCode.findOne({ code });
  if (existing) {
    throw new ApiError(409, "A promo code with this name already exists.");
  }

  const created = await PromoCode.create({
    ...data,
    code,
    createdBy: req.user._id,
  });
  return res.status(201).json({ promoCodes: [toAdminJSON(created)] });
});

export const updatePromoCode = asyncHandler(async (req, res) => {
  const code = await PromoCode.findById(req.params.id);
  if (!code) throw new ApiError(404, "Promo code not found.");

  const data = promoCodeSchema.partial().parse(req.body || {});
  if (data.discountValue !== undefined || data.discountType !== undefined) {
    assertValidDiscount(data.discountType ?? code.discountType, data.discountValue ?? code.discountValue);
  }

  if (data.code) {
    const normalized = normalizeCode(data.code);
    const clash = await PromoCode.findOne({ code: normalized, _id: { $ne: code._id } });
    if (clash) throw new ApiError(409, "A promo code with this name already exists.");
    data.code = normalized;
  }

  Object.assign(code, data);
  await code.save();
  return res.json({ promoCodes: [toAdminJSON(code)] });
});

// Soft-delete: archived codes can never be redeemed again but keep their usage
// history for reporting.
export const removePromoCode = asyncHandler(async (req, res) => {
  const code = await PromoCode.findById(req.params.id);
  if (!code) throw new ApiError(404, "Promo code not found.");
  code.archived = true;
  code.isActive = false;
  await code.save();
  return res.json({ ok: true });
});

export const promoUsage = asyncHandler(async (req, res) => {
  const code = await PromoCode.findById(req.params.id);
  if (!code) throw new ApiError(404, "Promo code not found.");

  const usages = await PromoCodeUsage.find({ promoCodeId: code._id })
    .sort({ usedAt: -1 })
    .limit(200)
    .populate("userId", "name email")
    .populate("paymentId", "orderId paymentId paidAt finalAmount");

  const rows = usages.map((u) => ({
    id: u._id,
    user: u.userId ? { id: u.userId._id, name: u.userId.name, email: u.userId.email } : null,
    paymentId: u.paymentId?._id || null,
    orderId: u.paymentId?.orderId || null,
    originalAmount: u.originalAmount,
    discountAmount: u.discountAmount,
    finalAmount: u.finalAmount,
    usedAt: u.usedAt,
  }));

  const totals = usages.reduce(
    (acc, u) => {
      acc.redemptions += 1;
      acc.discount += u.discountAmount;
      acc.revenue += u.finalAmount;
      return acc;
    },
    { redemptions: 0, discount: 0, revenue: 0 },
  );

  return res.json({
    promo: toAdminJSON(code),
    usage: rows,
    totals,
  });
});