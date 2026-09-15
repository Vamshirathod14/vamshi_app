import { Router } from "express";
import * as transactions from "../controllers/transactions.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.get("/stats", transactions.stats);
router.get("/", transactions.list);
router.get("/:id", transactions.get);
router.post("/", transactions.create);
router.patch("/:id", transactions.update);
router.delete("/:id", transactions.remove);
export default router;