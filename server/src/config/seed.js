import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Category } from "../models/Category.js";
import { Festival } from "../models/Festival.js";
import { env } from "./env.js";

// Built-in festival/event list for 2026, seeded only when the collection is
// empty so the admin table stays the single source of truth afterwards.
// Format: 2026-YYYY-MM-DD (IST). Edit freely from the admin panel.
const FESTIVALS_2026 = [
  { date: "2026-01-01", title: "Happy New Year! 🎉", body: "New year, new financial goals — log your first expense of 2026 with Liv." },
  { date: "2026-01-15", title: "Happy Pongal / Sankranti! 🪁", body: "Season of new beginnings — track your festive spending and stay in control." },
  { date: "2026-01-26", title: "Happy Republic Day! 🇮🇳", body: "Celebrate proudly and spend wisely. Log today's outings with Liv." },
  { date: "2026-02-14", title: "Happy Valentine's Day! 💝", body: "Love is sweet — and so is watching your budget. Record the day's treats." },
  { date: "2026-03-19", title: "Happy Ugadi! 🌸", body: "A new Telugu year begins — fresh budget, fresh blessings. Start logging today." },
  { date: "2026-03-21", title: "Happy Holi! 🎨", body: "A splash of colour and joy — don't let the festive fun blur your budget." },
  { date: "2026-03-31", title: "Eid Mubarak! 🌙", body: "May your days be abundant. Log the celebrations and keep every rupee counted." },
  { date: "2026-08-31", title: "Happy Raksha Bandhan! 🪢", body: "Celebrate the bond with love — and keep those gift spends recorded." },
  { date: "2026-09-14", title: "Ganesh Chaturthi! 🙏", body: "Ganpati Bappa Morya! Enjoy the festivities — track your expenses with ease." },
  { date: "2026-10-16", title: "Happy Dussehra! 🏹", body: "Good triumphs over evil. Celebrate big, but mind the budget too." },
  { date: "2026-11-08", title: "Happy Diwali! 🪔", body: "Light, laughter and sweets — may your savings shine the brightest. Log your festive spends." },
  { date: "2026-12-25", title: "Merry Christmas! 🎄", body: "A season of giving and cheer — keep your holiday spending merry and mindful." },
];

async function seedFestivals() {
  if ((await Festival.countDocuments({})) > 0) return;
  await Festival.insertMany(FESTIVALS_2026);
  console.info(`[seed] Seeded ${FESTIVALS_2026.length} festival/event days.`);
}

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
    await seedFestivals();
  } catch (err) {
    console.error("[seed] Failed:", err.message);
  }
}

export function MongoObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}