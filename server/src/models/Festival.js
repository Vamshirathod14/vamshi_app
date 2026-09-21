import mongoose from "mongoose";

// Admin-managed festival/event days. `date` is the IST calendar day
// ("YYYY-MM-DD") the broadcast is sent on, at 9:00 AM IST. The scheduler
// reads from this collection, so the owner controls every special-day message
// from the admin panel without a redeploy.
const festivalSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true },
    title: { type: String, required: true, maxlength: 120 },
    body: { type: String, required: true, maxlength: 500 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

festivalSchema.index({ date: 1 });

export const Festival = mongoose.model("Festival", festivalSchema);