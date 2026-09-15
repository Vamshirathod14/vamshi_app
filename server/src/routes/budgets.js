import { Router } from "express";
import * as budgets from "../controllers/budgets.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.get("/", budgets.listBudgets);
router.post("/", budgets.createBudget);
router.patch("/:id", budgets.updateBudget);
router.delete("/:id", budgets.deleteBudget);
export default router;