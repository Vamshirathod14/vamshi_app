import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema(
  {
    jti: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ["access", "refresh"], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    expiresAt: { type: Date, required: true },
    userAgent: { type: String, default: null },
    ip: { type: String, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SessionToken = mongoose.model("SessionToken", tokenSchema);