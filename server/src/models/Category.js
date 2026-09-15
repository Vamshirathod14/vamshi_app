import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    emoji: { type: String, default: "📦" },
    color: { type: String, default: "#64748b" },
    type: { type: String, enum: ["expense", "income"], default: "expense" },
    isDefault: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

categorySchema.index({ userId: 1, type: 1, name: 1 }, { unique: true });

export const Category = mongoose.model("Category", categorySchema);