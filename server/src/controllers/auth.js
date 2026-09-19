import { z } from "zod";
import { User } from "../models/User.js";
import { SessionToken } from "../models/Token.js";
import
{
  issueAccessToken,
  issueRefreshToken,
  rotateRefresh,
  clearAuthCookies,
  revokeUserSessions,
} from "../services/token.js";
import { ApiError, asyncHandler } from "../middleware/handle.js";
import { ensureUserDefaults } from "../config/seed.js";

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

export const login = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.verifyPassword(password))) {
    throw new ApiError(401, "Email or password is incorrect.");
  }
  await issueAccessToken(user, req);
  await issueRefreshToken(user, req);
  return res.json({ user: user.toSafe() });
});

export const register = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);
  const exists = await User.findOne({ email: data.email.toLowerCase() });
  if (exists) throw new ApiError(409, "An account with that email already exists.");
  const user = new User({ name: data.name, email: data.email.toLowerCase() });
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