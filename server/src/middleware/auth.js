import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { SessionToken } from "../models/Token.js";
import { User } from "../models/User.js";

export async function protect(req, res, next) {
  const token =
    req.cookies?.accessToken ||
    req.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  try {
    const payload = jwt.verify(token, env.jwtAccessSecret);
    if (!(await SessionToken.exists({ jti: payload.jti, revokedAt: null }))) {
      throw new Error("revoked");
    }
    const user = await User.findById(payload.sub);
    if (!user) throw new Error("user");
    req.user = user;
    next();
  } catch {
    res.clearCookie("accessToken");
    return res.status(401).json({ message: "Session expired. Please sign in again." });
  }
}