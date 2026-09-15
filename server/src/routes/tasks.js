import { Router } from "express";
import * as tasks from "../controllers/tasks.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.get("/", tasks.list);
router.post("/", tasks.create);
router.patch("/:id", tasks.update);
router.patch("/:id/toggle", tasks.toggle);
router.delete("/:id", tasks.remove);
export default router;