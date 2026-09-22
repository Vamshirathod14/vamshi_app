import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { User } from "../models/User.js";
import { SessionToken } from "../models/Token.js";
import {
  issueAccessToken,
  issueRefreshToken,
  rotateRefresh,
  clearAuthCookies,
  revokeUserSessions,
} from "../services/token.js";
import { sendPasswordResetEmail } from "../services/mailer.js";
import { ApiError, asyncHandler } from "../middleware/handle.js";
import { ensureUserDefaults } from "../config/seed.js";
import { env } from "../config/env.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6).max(128),
});

// Emails listed in ADMIN_EMAILS (env) are automatically promoted to admin so
// the owner can manage promotions and festival broadcasts from the panel.
async function promoteIfAdmin(user) {
  if (env.adminEmails.includes(user.email.toLowerCase()) && user.role !== "admin") {
    user.role = "admin";
    await user.save();
  }
  return user;
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.verifyPassword(password))) {
    throw new ApiError(401, "Email or password is incorrect.");
  }
  await promoteIfAdmin(user);
  await issueAccessToken(user, req);
  await issueRefreshToken(user, req);
  return res.json({ user: user.toSafe() });
});

export const register = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);
  const exists = await User.findOne({ email: data.email.toLowerCase() });
  if (exists) throw new ApiError(409, "An account with that email already exists.");
  const user = new User({ name: data.name, email: data.email.toLowerCase() });
  await promoteIfAdmin(user);
  await user.setPassword(data.password);
  await user.save();
  await ensureUserDefaults(user._id);
  user.defaultsSeeded = true;
  await user.save();
  await issueAccessToken(user, req);
  await issueRefreshToken(user, req);
  return res.status(201).json({ user: user.toSafe() });
});

export const refresh = asyncHandler(async (req, res) => {
  const userId = await rotateRefresh(req, res);
  if (!userId) throw new ApiError(401, "Session expired. Please sign in again.");
  const user = await User.findById(userId);
  if (!user) throw new ApiError(401, "Session expired. Please sign in again.");
  await issueAccessToken(user, req);
  await issueRefreshToken(user, req);
  return res.json({ user: user.toSafe() });
});

export const me = asyncHandler(async (req, res) => {
  // Lazy self-heal: accounts created before default seeding got no starting
  // account/categories. Backfill once so the first expense/income works.
  if (!req.user.defaultsSeeded) {
    await ensureUserDefaults(req.user._id);
    req.user.defaultsSeeded = true;
    await req.user.save();
  }
  await promoteIfAdmin(req.user);
  return res.json({ user: req.user.toSafe() });
});

export const logout = asyncHandler(async (req, res) => {
  await revokeUserSessions(req.user._id);
  clearAuthCookies(res);
  return res.json({ message: "Signed out." });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = passwordSchema.parse(req.body);
  if (!(await req.user.verifyPassword(currentPassword))) {
    throw new ApiError(401, "Current password is incorrect.");
  }
  await req.user.setPassword(newPassword);
  await req.user.save();
  return res.json({ message: "Password updated." });
});

// ================= Password reset (forgot password) =================

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const hashResetToken = (token) =>
  createHash("sha256").update(token).digest("hex");

const forgotSchema = z.object({ email: z.string().email() });
const resetPasswordSchema = z.object({
  token: z.string().min(20).max(256),
  newPassword: z.string().min(6).max(128),
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = forgotSchema.parse(req.body);
  const user = await User.findOne({ email: email.toLowerCase() });

  if (user) {
    // Store only a hash of the token so a database leak can't be used to
    // reset accounts. The raw token is sent to the user's inbox, never saved.
    const token = randomBytes(32).toString("hex");
    user.passwordResetTokenHash = hashResetToken(token);
    user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    await user.save();

    const resetUrl = `${env.clientOrigin}/reset-password?token=${token}`;
    // Fire-and-forget: failures are logged but the response stays generic so
    // attackers can't probe which emails have accounts.
    sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      resetUrl,
    }).catch((err) =>
      console.error(`[mail] reset email failed for ${user.email}: ${err.message}`),
    );
  }

  return res.json({
    message:
      "If an account exists for that email, a password reset link is on its way.",
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = resetPasswordSchema.parse(req.body);
  const user = await User.findOne({
    passwordResetTokenHash: hashResetToken(token),
    passwordResetExpires: { $gt: new Date() },
  });
  if (!user) {
    throw new ApiError(
      400,
      "This reset link is invalid or has expired. Please request a new one.",
    );
  }

  await user.setPassword(newPassword);
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  await user.save();

  // Reset the password, drop every session (incl. stolen ones), and clear
  // refresh cookies so the old login is fully dead.
  await revokeUserSessions(user._id);
  clearAuthCookies(res);

  return res.json({ message: "Password updated. You can now sign in." });
});