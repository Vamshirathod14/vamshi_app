import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Category } from "../models/Category.js";
import { env } from "./env.js";

const DEFAULT_CATEGORIES = [
  { name: "Food", emoji: "🍔", color: "#f59e0b", type: "expense" },
  { name: "Transport", emoji: "🚗", color: "#3b82f6", type: "expense" },
  { name: "Home", emoji: "🏠", color: "#8b5cf6", type: "expense" },
  { name: "Shopping", emoji: "🛒", color: "#ec4899", type: "expense" },
  { name: "Bills & Recharge", emoji: "📱", color: "#06b6d4", type: "expense" },
  { name: "Software", emoji: "💻", color: "#6366f1", type: "expense" },
  { name: "Education", emoji: "🎓", color: "#14b8a6", type: "expense" },
  { name: "Entertainment", emoji: "🎬", color: "#f43f5e", type: "expense" },
  { name: "Travel", emoji: "✈️", color: "#0ea5e9", type: "expense" },
  { name: "Health", emoji: "🏥", color: "#ef4444", type: "expense" },
  { name: "Personal", emoji: "👕", color: "#a855f7", type: "expense" },
  { name: "Other", emoji: "📦", color: "#64748b", type: "expense" },
];

const DEFAULT_SOURCES = [
  { name: "Salary", emoji: "💼", color: "#10b981", type: "income" },
  { name: "Freelance", emoji: "🧑‍💻", color: "#22c55e", type: "income" },
  { name: "Business", emoji: "🏪", color: "#84cc16", type: "income" },
  { name: "Other", emoji: "💰", color: "#38bdf8", type: "income" },
];

async function seedCategoryDefaults(userId) {
  if ((await Category.countDocuments({ userId })) > 0) return;
  await Category.insertMany(
    [...DEFAULT_CATEGORIES, ...DEFAULT_SOURCES].map((c, i) => ({
      userId,
      ...c,
      isDefault: true,
      sortOrder: i,
    })),
  );
}

// Gives every user a working starting point: the standard category list, so a
// new user can immediately add income and expenses on their own. Accounts are
// NOT auto-created — income/expense work with zero accounts for now.
export async function ensureUserDefaults(userId) {
  await seedCategoryDefaults(userId);
}

async function seedBootstrap() {
  const existing = await User.findOne({ role: "user" }).collation({
    locale: "en",
    strength: 2,
  });
  if (existing) {
    await ensureUserDefaults(existing._id);
    return;
  }

  const password = env.bootstrap.password || "changeme123";
  const user = new User({
    name: env.bootstrap.name,
    email: env.bootstrap.email.toLowerCase(),
  });
  await user.setPassword(password);
  await user.save();

  await ensureUserDefaults(user._id);

  console.log(
    `[seed] Bootstrapped demo user: ${env.bootstrap.email} (password: ${password})`,
  );
}

export async function seed() {
  try {
    await seedBootstrap();
  } catch (err) {
    console.error("[seed] Failed:", err.message);
  }
}

export function MongoObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}