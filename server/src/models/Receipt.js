import mongoose from "mongoose";

const receiptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true, trim: true, maxlength: 200 },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    storagePath: { type: String, required: true },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction", default: null },
  },
  { timestamps: true },
);

export const Receipt = mongoose.model("Receipt", receiptSchema);