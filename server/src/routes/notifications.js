import { Router } from "express";
import * as notifications from "../controllers/notifications.js";
import { protect } from "../middleware/auth.js";
import { requireActiveSubscription } from "../middleware/subscription.js";
import { pushLimiter } from "../middleware/rateLimit.js";

const router = Router();
router.use(protect);
router.use(requireActiveSubscription);
router.get("/", notifications.list);
router.patch("/read", notifications.markRead);
router.patch("/:id/read", notifications.markOneRead);
router.post("/subscribe", pushLimiter, notifications.pushSubscribe);
router.post("/unsubscribe", pushLimiter, notifications.pushUnsubscribe);
router.delete("/:id", notifications.remove);
router.post("/sessions/clear", notifications.clearSessions);

// Web Push device management
router.get("/push/public-key", notifications.pushPublicKey);
router.get("/push/status", notifications.pushStatus);
router.post("/push/subscribe", pushLimiter, notifications.pushSubscribe);
router.delete("/push/unsubscribe", pushLimiter, notifications.pushUnsubscribe);
router.post("/push/test", pushLimiter, notifications.pushTest);
router.post("/push/ack", notifications.pushAck);
router.post("/push/ack-alarm", notifications.ackAlarm);
router.get("/push/diag", notifications.pushDiag);
export default router;