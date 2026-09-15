import { Router } from "express";
import * as exporter from "../controllers/export.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.get("/csv", exporter.exportCsv);
router.get("/json", exporter.exportJson);
router.post("/import", exporter.importJson);
export default router;