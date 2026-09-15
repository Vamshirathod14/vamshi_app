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

// Ensure the MongoDB URI always points at an explicit database. Atlas
// "Connect" strings carry no database segment; without one the driver falls
// back to the "test" database. Only applied when no database is present.
function withDefaultDatabase(uri, fallback) {
  if (!uri) return uri;
  try {
    const u = new URL(uri);
    if ((u.protocol === "mongodb:" || u.protocol === "mongodb+srv:") && !u.pathname.slice(1)) {
      u.pathname = `/${fallback}`;
    }
    return u.toString();
  } catch {
    return uri;
  }
}

const defaultDatabase = process.env.MONGODB_DB || "vamshi";

export const env = {
  port: num(process.env.PORT, 3001),
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: withDefaultDatabase(process.env.MONGODB_URI, defaultDatabase),
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