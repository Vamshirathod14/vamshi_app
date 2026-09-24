import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

import { env } from "./config/env.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { notFound, errorHandler } from "./middleware/error.js";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import accountRoutes from "./routes/accounts.js";
import categoryRoutes from "./routes/categories.js";
import transactionRoutes from "./routes/transactions.js";
import analyticsRoutes from "./routes/analytics.js";
import budgetRoutes from "./routes/budgets.js";
import goalRoutes from "./routes/goals.js";
import taskRoutes from "./routes/tasks.js";
import noteRoutes from "./routes/notes.js";
import reminderRoutes from "./routes/reminders.js";
import recurringRoutes from "./routes/recurring.js";
import notificationRoutes from "./routes/notifications.js";
import receiptRoutes from "./routes/receipts.js";
import exportRoutes from "./routes/export.js";
import dashboardRoutes from "./routes/dashboard.js";
import subscriptionRoutes from "./routes/subscription.js";
import adminRoutes from "./routes/admin.js";
import webhookRoutes from "./routes/webhooks.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          // Allow Google AdSense to load and serve ads on the page.
          scriptSrc: [
            "'self'",
            "https://pagead2.googlesyndication.com",
            "https://*.googlesyndication.com",
            "https://www.googletagmanager.com",
            "https://*.adtrafficquality.google",
          ],
          imgSrc: [
            "'self'",
            "data:",
            "https://pagead2.googlesyndication.com",
            "https://*.googlesyndication.com",
            "https://googleads.g.doubleclick.net",
            "https://*.doubleclick.net",
            "https://www.google.com",
            "https://*.google.com",
          ],
          frameSrc: [
            "https://googleads.g.doubleclick.net",
            "https://*.googlesyndication.com",
            "https://*.doubleclick.net",
          ],
          connectSrc: [
            "'self'",
            "https://www.google.com",
            "https://*.google.com",
            "https://*.googleapis.com",
            "https://*.googlesyndication.com",
            "https://*.google",
            "https://*.adtrafficquality.google",
          ],
        },
      },
    }),
  );

  app.use(
    cors({
      origin: env.clientOrigin.split(",").map((s) => s.trim()),
      credentials: true,
    }),
  );

  app.use(compression());
  app.use(
    "/api/webhooks/razorpay",
    express.raw({ type: () => true, limit: "2mb" }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use("/uploads", express.static("uploads", { fallthrough: true }));
  app.use(
    "/uploads",
    (_req, res, next) => {
      res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
      next();
    },
    (_req, res) => res.status(404).json({ message: "File not found." }),
  );

  app.use("/api", apiLimiter);

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/subscription", subscriptionRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/webhooks", webhookRoutes);
  app.use("/api/accounts", accountRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/transactions", transactionRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/budgets", budgetRoutes);
  app.use("/api/goals", goalRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/notes", noteRoutes);
  app.use("/api/reminders", reminderRoutes);
  app.use("/api/recurring", recurringRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/receipts", receiptRoutes);
  app.use("/api/export", exportRoutes);
  app.use("/api/dashboard", dashboardRoutes);

  app.get("/api/health", (_req, res) =>
    res.json({ ok: true, service: "vamshi-server" }),
  );

  // Serve the built client from the API origin (same-origin deployment) whenever
  // client/dist exists — this keeps auth cookies first-party, avoiding CORS and
  // cross-site cookie restrictions entirely. Falls through for /api and /uploads.
  // Resolved relative to this file so it works no matter what the process cwd is.
  const clientDist = [
    path.resolve(here, "../../client/dist"),
    path.resolve(process.cwd(), "client/dist"),
    path.resolve(process.cwd(), "../client/dist"),
  ].find((p) => fs.existsSync(p));
  if (clientDist) {
    app.use(express.static(clientDist));
    app.get("*", (_req, res, next) => {
      if (_req.path.startsWith("/api") || _req.path.startsWith("/uploads")) return next();
      return res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  app.use("/api", notFound);
  app.use(errorHandler);

  return app;
}