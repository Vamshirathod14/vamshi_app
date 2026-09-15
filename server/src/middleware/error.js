import { ZodError } from "zod";
import { ApiError } from "./handle.js";

export function notFound(req, res, next) {
  res.status(404).json({ message: "That resource does not exist." });
}

export function errorHandler(err, req, res, _next) {
  console.error("[error]", err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Please check the values you entered.",
      details: err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({
      message: err.message,
      details: err.details,
    });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({ message: err.message });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid identifier provided." });
  }

  if (err.name === "MongoNetworkError" || err.name === "MongoServerSelectionError") {
    return res.status(503).json({
      message: "Something went wrong while loading your data. Please try again.",
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({ message: "That already exists." });
  }

  return res.status(500).json({
    message: "Something went wrong. Please try again.",
  });
}