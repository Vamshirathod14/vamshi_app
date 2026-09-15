import { Router } from "express";
import * as notes from "../controllers/notes.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.get("/", notes.list);
router.get("/:id", notes.get);
router.post("/", notes.create);
router.patch("/:id", notes.update);
router.patch("/:id/pin", notes.togglePin);
router.patch("/:id/archive", notes.toggleArchive);
router.post("/:id/convert", notes.convertChecklistToTask);
router.delete("/:id", notes.remove);
export default router;