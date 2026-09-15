import { Router } from "express";
import { updateProfile, deleteAccount } from "../controllers/users.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.patch("/profile", protect, updateProfile);
router.delete("/account", protect, deleteAccount);
export default router;