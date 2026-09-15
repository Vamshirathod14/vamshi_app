import { z } from "zod";
import { Note } from "../models/Note.js";
import { Task } from "../models/Task.js";
import { asyncHandler, ApiError } from "../middleware/handle.js";

const noteSchema = z.object({
  title: z.string().max(200).optional().default(""),
  content: z.string().max(20000).optional().default(""),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  tags: z.array(z.string().max(40)).optional(),
  checklist: z
    .array(
      z.object({
        _id: z.string().optional(),
        text: z.string().min(1).max(500),
        checked: z.boolean().optional().default(false),
      }),
    )
    .optional(),
});

export const list = asyncHandler(async (req, res) => {
  const { q, archived } = req.query;
  const base = { userId: req.user._id, archived: archived === "true" };
  if (q) {
    base.$or = [
      { title: { $regex: q, $options: "i" } },
      { content: { $regex: q, $options: "i" } },
      { tags: { $regex: q, $options: "i" } },
    ];
  }
  const notes = await Note.find(base)
    .sort({ pinned: -1, updatedAt: -1 })
    .select("-content");
  return res.json({ notes });
});

export const get = asyncHandler(async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });
  if (!note) throw new ApiError(404, "Note not found.");
  return res.json({ note });
});

export const create = asyncHandler(async (req, res) => {
  const data = noteSchema.parse(req.body);
  const note = await Note.create({ userId: req.user._id, ...data });
  return res.status(201).json({ note });
});

export const update = asyncHandler(async (req, res) => {
  const data = noteSchema.partial().parse(req.body);
  const note = await Note.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: data },
    { new: true, runValidators: true },
  );
  if (!note) throw new ApiError(404, "Note not found.");
  return res.json({ note });
});

export const remove = asyncHandler(async (req, res) => {
  const note = await Note.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!note) throw new ApiError(404, "Note not found.");
  return res.json({ message: "Note deleted." });
});

export const togglePin = asyncHandler(async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });
  if (!note) throw new ApiError(404, "Note not found.");
  note.pinned = !note.pinned;
  await note.save();
  return res.json({ note });
});

export const toggleArchive = asyncHandler(async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });
  if (!note) throw new ApiError(404, "Note not found.");
  note.archived = !note.archived;
  if (note.archived) note.pinned = false;
  await note.save();
  return res.json({ note });
});

export const convertChecklistToTask = asyncHandler(async (req, res) => {
  const { itemId, dueDate, dueTime } = z
    .object({
      itemId: z.string().min(1),
      dueDate: z.union([z.string(), z.date()]).nullable().optional(),
      dueTime: z.string().nullable().optional(),
    })
    .parse(req.body);

  const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });
  if (!note) throw new ApiError(404, "Note not found.");
  const item = note.checklist.find((c) => c._id.toString() === itemId);
  if (!item) throw new ApiError(404, "Checklist item not found.");

  item.checked = true;
  note.markModified("checklist");
  await note.save();

  const task = await Task.create({
    userId: req.user._id,
    title: item.text,
    source: `From note: ${note.title || "Untitled"}`,
    noteId: note._id,
    dueDate: dueDate ? new Date(dueDate) : null,
    dueTime: dueTime || null,
  });

  return res.status(201).json({ task, note });
});