import { Router } from "express";
import * as goals from "../controllers/goals.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.get("/", goals.list);
router.post("/", goals.create);
router.patch("/:id", goals.update);
router.delete("/:id", goals.remove);
router.post("/:id/contributions", goals.addContribution);
router.delete("/:id/contributions/:contribIdx", goals.removeContribution);
export default router;