import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, trim: true, maxlength: 200, default: "" },
    content: { type: String, trim: true, maxlength: 20000, default: "" },
    pinned: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    tags: { type: [String], default: [] },
    checklist: [
      {
        text: { type: String, required: true, trim: true, maxlength: 500 },
        checked: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true },
);

noteSchema.index({ userId: 1, pinned: -1, updatedAt: -1 });
noteSchema.index({ userId: 1, archived: 1 });

export const Note = mongoose.model("Note", noteSchema);