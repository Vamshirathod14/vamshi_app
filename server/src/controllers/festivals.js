import { z } from "zod";
import { Festival } from "../models/Festival.js";
import { asyncHandler, ApiError } from "../middleware/handle.js";

const festSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD (IST)."),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
  active: z.boolean().optional().default(true),
});

export const listFestivals = asyncHandler(async (_req, res) => {
  const festivals = await Festival.find().sort({ date: 1 }).lean();
  return res.json({ festivals });
});

export const createFestival = asyncHandler(async (req, res) => {
  const data = festSchema.parse(req.body);
  const exists = await Festival.findOne({ date: data.date });
  if (exists) {
    throw new ApiError(409, "A festival/event already exists for that date.");
  }
  const festival = await Festival.create(data);
  return res.status(201).json({ festival });
});

export const updateFestival = asyncHandler(async (req, res) => {
  const data = festSchema.partial().parse(req.body);
  if (data.date) {
    const clash = await Festival.findOne({
      date: data.date,
      _id: { $ne: req.params.id },
    });
    if (clash) {
      throw new ApiError(409, "A festival/event already exists for that date.");
    }
  }
  const festival = await Festival.findOneAndUpdate(
    { _id: req.params.id },
    { $set: data },
    { new: true, runValidators: true },
  );
  if (!festival) throw new ApiError(404, "Festival not found.");
  return res.json({ festival });
});

export const removeFestival = asyncHandler(async (req, res) => {
  const deleted = await Festival.findOneAndDelete({ _id: req.params.id });
  if (!deleted) throw new ApiError(404, "Festival not found.");
  return res.json({ message: "Festival removed." });
});