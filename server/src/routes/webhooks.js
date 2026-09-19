import { Router } from "express";
import { razorpayWebhook } from "../controllers/webhooks.js";

// NOTE: mounted in app.js BEFORE express.json() with express.raw() so the
// signature can be verified against the exact request bytes.
const router = Router();
router.post("/razorpay", razorpayWebhook);

export default router;