import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { SessionToken } from "../models/Token.js";

function expiresInToDate(expiresIn) {
  const match = String(expiresIn).match(/^(\d+)([smhd])$/);
  if (!match) return new Date(Date.now() + 15 * 60 * 1000);
  const [, num, unit] = match;
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit];
  return new Date(Date.now() + Number(num) * mult);
}

function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    maxAge: maxAgeMs,
    path: "/",
  };
}

export async function issueAccessToken(user, req) {
  const jti = randomUUID();
  const expiresAt = expiresInToDate(env.jwtAccessExpiresIn);
  await SessionToken.create({
    jti,
    type: "access",
    userId: user._id,
    expiresAt,
    userAgent: req.headers["user-agent"] || null,
    ip: req.ip || null,
  });
  const token = jwt.sign({ jti, sub: user._id.toString() }, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn,
  });
  req.res?.cookie("accessToken", token, cookieOptions(expiresAt.getTime() - Date.now()));
  return token;
}

export async function issueRefreshToken(user, req) {
  const jti = randomUUID();
  const expiresAt = expiresInToDate(env.jwtRefreshExpiresIn);
  await SessionToken.create({
    jti,
    type: "refresh",
    userId: user._id,
    expiresAt,
    userAgent: req.headers["user-agent"] || null,
    ip: req.ip || null,
  });
  const token = jwt.sign({ jti, sub: user._id.toString() }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  });
  req.res?.cookie("refreshToken", token, cookieOptions(expiresAt.getTime() - Date.now()));
  return token;
}

export async function rotateRefresh(req, res) {
  const token = req.cookies?.refreshToken;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.jwtRefreshSecret);
    const stored = await SessionToken.findOne({ jti: payload.jti, revokedAt: null });
    if (!stored || stored.expiresAt < new Date()) return null;
    stored.revokedAt = new Date();
    await stored.save();
    return payload.sub;
  } catch {
    return null;
  }
}

export function clearAuthCookies(res) {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
}

export async function revokeUserSessions(userId, exceptJti) {
  const filter = { userId, revokedAt: null };
  if (exceptJti) filter.jti = { $ne: exceptJti };
  await SessionToken.updateMany(filter, { $set: { revokedAt: new Date() } });
}