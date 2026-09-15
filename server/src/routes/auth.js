import { Router } from "express";
import { login, register, refresh, me, logout, changePassword } from "../controllers/auth.js";
import { protect } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.post("/login", authLimiter, login);
router.post("/register", authLimiter, register);
router.post("/refresh", refresh);
router.get("/me", protect, me);
router.post("/logout", protect, logout);
router.patch("/password", protect, changePassword);

export default router;