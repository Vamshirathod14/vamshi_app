import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDb() {
  mongoose.set("strictQuery", true);
  mongoose.connection.on("error", (err) => {
    console.error("[db] MongoDB connection error:", err.message);
  });
  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
  });
  console.log("[db] Connected to MongoDB");
}