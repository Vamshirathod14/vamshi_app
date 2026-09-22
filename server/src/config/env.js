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

export const nodeEnv = process.env.NODE_ENV || "development";

// Payment mode. Development servers default to "test"; production forces "live"
// — running a publicly-visible production server with test payments would let
// users "pay" nothing and get premium, so it is never allowed.
const requestedPaymentMode = (process.env.PAYMENT_MODE || (nodeEnv === "production" ? "live" : "test")).toLowerCase();
const paymentMode = requestedPaymentMode === "live" ? "live" : "test";
if (nodeEnv === "production" && paymentMode !== "live") {
  console.warn("[env] PAYMENT_MODE must be 'live' in production — forcing live mode.");
}

export const env = {
  port: num(process.env.PORT, 3001),
  nodeEnv,
  paymentMode,
  mongoUri: withDefaultDatabase(process.env.MONGODB_URI, defaultDatabase),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  // Secure defaults to true in production (HTTPS) but can be forced off with COOKIE_SECURE=false (e.g. local HTTPS-less runs).
  cookieSecure:
    process.env.COOKIE_SECURE === "true" ||
    (process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false"),
  cookieSameSite: process.env.COOKIE_SAME_SITE || "lax",
  // Partitioned (CHIPS): required for cross-site deployments (e.g. frontend and API on
  // separate domains/subdomains under a public suffix, like *.onrender.com) where browsers
  // block third-party cookies. Use "true" only when the frontend origin differs from the API origin.
  cookiePartitioned: process.env.COOKIE_PARTITIONED === "true",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  bootstrap: {
    name: process.env.BOOTSTRAP_NAME || "Me",
    email: process.env.BOOTSTRAP_EMAIL || "me@localhost",
    password: process.env.BOOTSTRAP_PASSWORD || "changeme123",
  },
  // Accounts whose email appears here are auto-promoted to admin on login /
  // register / session refresh — they can manage promo codes and festival
  // broadcasts. Comma-separated list, e.g. "you@gmail.com,me@outlook.com".
  adminEmails: (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  maxReceiptSizeMb: num(process.env.MAX_RECEIPT_SIZE_MB, 5),

  // Email (SMTP) for password resets. Leave unset and reset links are just
  // logged to the server console (handy for dev). Use any provider — Gmail
  // app password, Zoho, AWS SES SMTP, etc.
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: num(process.env.SMTP_PORT, 587),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  mailFrom: (process.env.MAIL_FROM || "").replace(/^["']|["']$/g, ""),
  // Brevo HTTP API key (xkeysib-...) — used instead of SMTP when present.
  // HTTPS (443) is far more reliable from Render than a raw SMTP relay.
  brevoApiKey: process.env.BREVO_API_KEY || "",

  // Web Push (VAPID). Public key is safe to send to browsers; the private key
  // must NEVER leave the server. Configure locally with:
  //   npx web-push generate-vapid-keys
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || "",
  vapidSubject: process.env.VAPID_SUBJECT || "mailto:admin@vamshi.local",

  // Razorpay payments (optional). Without credentials the app still starts and
  // the subscription page reports that payments are not configured so users
  // can never be charged silently.
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
  // Optional: reuse a specific Razorpay plan for renewals instead of
  // auto-creating one on first payment. Number of paid billing cycles an
  // auto-renew subscription runs for (36 ≈ 3 years, then can be renewed).
  razorpayPlanId: process.env.RAZORPAY_PLAN_ID || "",
  razorpaySubscriptionCycles: num(process.env.RAZORPAY_SUBSCRIPTION_CYCLES, 36),
};

export const razorpayConfigured = Boolean(
  env.razorpayKeyId && env.razorpayKeySecret,
);
export const razorpayWebhookConfigured = Boolean(env.razorpayWebhookSecret);

export const vapidConfigured = Boolean(
  env.vapidPublicKey && env.vapidPrivateKey,
);