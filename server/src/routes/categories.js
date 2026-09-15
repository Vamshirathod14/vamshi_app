import { Router } from "express";
import * as categories from "../controllers/categories.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.get("/", categories.list);
router.post("/", categories.create);
router.patch("/:id", categories.update);
router.delete("/:id", categories.remove);
export default router;