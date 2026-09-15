import dotenv from "dotenv";

dotenv.config();

const required = ["MONGODB_URI", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[env] Missing required environment variable: ${key}`);
  }
}

function num(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  port: num(process.env.PORT, 3001),
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/vault",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  cookieSameSite: process.env.COOKIE_SAME_SITE || "lax",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  bootstrap: {
    name: process.env.BOOTSTRAP_NAME || "Me",
    email: process.env.BOOTSTRAP_EMAIL || "me@localhost",
    password: process.env.BOOTSTRAP_PASSWORD || "changeme123",
  },
  maxReceiptSizeMb: num(process.env.MAX_RECEIPT_SIZE_MB, 5),
};