import { Router } from "express";
import { overview } from "../controllers/dashboard.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.get("/", overview);
export default router;