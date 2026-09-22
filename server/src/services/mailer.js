import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const smtpConfigured = Boolean(env.smtpHost && env.smtpUser && env.smtpPass);

function transport() {
  if (!smtpConfigured) return null;
  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: { user: env.smtpUser, pass: env.smtpPass },
  });
}

export async function sendEmail({ to, subject, text, html }) {
  const t = transport();
  if (!t) {
    console.info(`[mail] SMTP not configured — would send to ${to}: ${subject}`);
    console.info(`[mail] --- ${text}`);
    return { delivered: false, logged: true };
  }
  const info = await t.sendMail({
    from: env.mailFrom || `"Vamshi" <${env.smtpUser}>`,
    to,
    subject,
    text,
    html,
  });
  console.info(`[mail] sent "${subject}" to ${to} (${info.messageId})`);
  return { delivered: true };
}

export function sendPasswordResetEmail({ email, name, resetUrl }) {
  const subject = "Reset your Vamshi password";
  const text = [
    `Hi ${name || "there"},`,
    "",
    "We received a request to reset your Vamshi password.",
    "Click the link below to choose a new one:",
    "",
    resetUrl,
    "",
    "This link expires in 30 minutes.",
    "If you didn't ask for this, you can safely ignore this email.",
    "",
    "— Vamshi",
  ].join("\n");
  const html = [
    `<p>Hi ${name || "there"},</p>`,
    "<p>We received a request to reset your Vamshi password.</p>",
    `<p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#0a84ff;color:#fff;text-decoration:none;border-radius:8px">Reset your password</a></p>`,
    `<p>Or paste this link: <a href="${resetUrl}">${resetUrl}</a></p>`,
    "<p>This link expires in <strong>30 minutes</strong>. If you didn't ask for this, you can safely ignore this email.</p>",
    "<p>— Vamshi</p>",
  ].join("");
  return sendEmail({ to: email, subject, text, html });
}