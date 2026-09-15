import { Router } from "express";
import * as accounts from "../controllers/accounts.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.get("/", accounts.list);
router.post("/", accounts.create);
router.patch("/:id", accounts.update);
router.delete("/:id", accounts.remove);
export default router;