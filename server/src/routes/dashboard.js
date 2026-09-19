import { Router } from "express";
import { overview } from "../controllers/dashboard.js";
import { protect } from "../middleware/auth.js";
import { requireActiveSubscription } from "../middleware/subscription.js";

const router = Router();
router.use(protect);
router.use(requireActiveSubscription);
router.get("/", overview);
export default router;