import { Router } from "express";
import {
  stats,
  listPromoCodes,
  createPromoCode,
  updatePromoCode,
  removePromoCode,
  promoUsage,
} from "../controllers/admin.js";
import { protect } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/subscription.js";

const router = Router();
router.use(protect, requireAdmin);
router.get("/stats", stats);
router.get("/promo-codes", listPromoCodes);
router.post("/promo-codes", createPromoCode);
router.patch("/promo-codes/:id", updatePromoCode);
router.delete("/promo-codes/:id", removePromoCode);
router.get("/promo-codes/:id/usage", promoUsage);

export default router;