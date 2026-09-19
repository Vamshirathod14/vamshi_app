import { Router } from "express";
import * as notifications from "../controllers/notifications.js";
import { protect } from "../middleware/auth.js";
import { requireActiveSubscription } from "../middleware/subscription.js";

const router = Router();
router.use(protect);
router.use(requireActiveSubscription);
router.get("/", notifications.list);
router.patch("/read", notifications.markRead);
router.patch("/:id/read", notifications.markOneRead);
router.post("/subscribe", notifications.pushSubscribe);
router.post("/unsubscribe", notifications.pushUnsubscribe);
router.delete("/:id", notifications.remove);
router.post("/sessions/clear", notifications.clearSessions);
export default router;