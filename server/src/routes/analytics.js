import { Router } from "express";
import * as analytics from "../controllers/analytics.js";
import { protect } from "../middleware/auth.js";
import { requireActiveSubscription } from "../middleware/subscription.js";

const router = Router();
router.use(protect);
router.use(requireActiveSubscription);
router.get("/summary", analytics.summary);
router.get("/categories", analytics.categoryBreakdown);
router.get("/trend", analytics.trend);
router.get("/insights", analytics.insights);
export default router;