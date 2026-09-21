import { Router } from "express";
import {
  stats,
  listUsers,
  broadcastMessage,
  broadcastToUser,
} from "../controllers/admin.js";
import {
  listFestivals,
  createFestival,
  updateFestival,
  removeFestival,
} from "../controllers/festivals.js";
import { protect } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/subscription.js";

const router = Router();
router.use(protect, requireAdmin);
router.get("/stats", stats);
router.get("/users", listUsers);
router.post("/broadcast", broadcastMessage);
router.post("/broadcast/user", broadcastToUser);
router.get("/festivals", listFestivals);
router.post("/festivals", createFestival);
router.patch("/festivals/:id", updateFestival);
router.delete("/festivals/:id", removeFestival);

export default router;