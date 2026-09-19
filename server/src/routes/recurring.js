import { Router } from "express";
import * as recurring from "../controllers/recurring.js";
import { protect } from "../middleware/auth.js";
import { requireActiveSubscription } from "../middleware/subscription.js";

const router = Router();
router.use(protect);
router.use(requireActiveSubscription);
router.get("/upcoming", recurring.upcoming);
router.get("/", recurring.list);
router.post("/", recurring.create);
router.patch("/:id", recurring.update);
router.delete("/:id", recurring.remove);
export default router;