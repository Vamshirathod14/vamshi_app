import { Router } from "express";
import {
  config,
  summary,
  history,
  validatePromo,
  startCheckout,
  verifyPayment,
} from "../controllers/subscription.js";
import { protect } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";

const router = Router();

// Subscription/account management is deliberately NOT gated behind an active
// subscription — users must be able to view status and renew when inactive/expired.
// Payment-attempt endpoints carry the stricter auth limiter; promo validation is
// read-only and covered by the general /api limiter.
router.get("/config", protect, config);
router.get("/", protect, summary);
router.get("/history", protect, history);
router.post("/promo/validate", protect, validatePromo);
router.post("/order", authLimiter, protect, startCheckout);
router.post("/verify", authLimiter, protect, verifyPayment);

export default router;