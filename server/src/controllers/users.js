import { z } from "zod";
import { User } from "../models/User.js";
import { ApiError, asyncHandler } from "../middleware/handle.js";

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  currency: z.string().max(10).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  notificationsEnabled: z.boolean().optional(),
  notificationPrefs: z
    .object({
      taskReminders: z.boolean().optional(),
      generalReminders: z.boolean().optional(),
      budgetAlerts: z.boolean().optional(),
      paymentAlerts: z.boolean().optional(),
      goalMilestones: z.boolean().optional(),
      summary: z.boolean().optional(),
    })
    .optional(),
  avatar: z.string().url().max(500).nullable().optional(),
});

export const updateProfile = asyncHandler(async (req, res) => {
  const data = updateSchema.parse(req.body);
  if (data.notificationsEnabled !== undefined)
    req.user.notificationsEnabled = data.notificationsEnabled;
  if (data.notificationPrefs)
    Object.assign(req.user.notificationPrefs, data.notificationPrefs);
  if (data.name) req.user.name = data.name;
  if (data.currency) req.user.currency = data.currency;
  if (data.theme) req.user.theme = data.theme;
  if (data.avatar !== undefined) req.user.avatar = data.avatar;
  await req.user.save();
  return res.json({ user: req.user.toSafe() });
});

export const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body || {};
  if (!password || !(await req.user.verifyPassword(password))) {
    throw new ApiError(401, "Password is required to delete your account.");
  }
  await User.deleteOne({ _id: req.user._id });
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  return res.json({ message: "Account deleted." });
});