import { Router } from "express";
import {
  login,
  register,
  refresh,
  me,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.js";
import { protect } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.post("/login", authLimiter, login);
router.post("/register", authLimiter, register);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);
router.post("/refresh", refresh);
router.get("/me", protect, me);
router.post("/logout", protect, logout);
router.patch("/password", protect, changePassword);

export default router;