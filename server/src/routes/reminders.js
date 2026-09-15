import { Router } from "express";
import * as reminders from "../controllers/reminders.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.get("/", reminders.list);
router.post("/", reminders.create);
router.patch("/:id", reminders.update);
router.patch("/:id/complete", reminders.complete);
router.post("/:id/snooze", reminders.snooze);
router.delete("/:id", reminders.remove);
export default router;