import nodemailer from "nodemailer";
import { env } from "../config/env.js";

// Prefer the Brevo HTTP API (HTTPS / 443) — many hosts (Render included)
// cannot reach Brevo's raw SMTP relay (587), which fails with timeouts.
const useBrevoApi = Boolean(env.brevoApiKey);
const smtpConfigured = Boolean(env.smtpHost && env.smtpUser && env.smtpPass);

if (useBrevoApi) {
  console.info(
    `[mail] Brevo HTTP API ready (sender=${env.mailFrom || env.smtpUser || "set MAIL_FROM"})`,
  );
} else if (smtpConfigured) {
  console.info(
    `[mail] SMTP ready: ${env.smtpUser}@${env.smtpHost}:${env.smtpPort} from=${env.mailFrom || env.smtpUser}`,
  );
} else {
  console.info("[mail] Email not configured — password reset links will be logged to the console.");
}

/** "Name <a@b.c>" → { name, email }; plain "a@b.c" → { email }. */
function splitFrom(from) {
  if (!from) return {};
  const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1].trim(), email: m[2].trim() } : { email: from.trim() };
}

async function sendViaBrevoApi({ to, subject, text, html }) {
  const sender = splitFrom(env.mailFrom);
  const body = {
    sender,
    to: splitFrom(to) ? [splitFrom(to)] : [],
    subject,
    textContent: text,
    htmlContent: html,
  };
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": env.brevoApiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(
      `[mail] Brevo API rejected (${res.status}) for ${to}: ${detail.slice(0, 300)}`,
    );
    throw new Error(`Brevo API error ${res.status}: ${detail.slice(0, 200)}`);
  }
  const payload = await res.json().catch(() => ({}));
  console.info(
    `[mail] sent "${subject}" to ${to} (Brevo id=${payload.messageId || "?"})`,
  );
  return { delivered: true };
}

async function sendViaSmtp({ to, subject, text, html }) {
  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: { user: env.smtpUser, pass: env.smtpPass },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });
  const info = await transporter.sendMail({
    from: env.mailFrom || `"Liv" <${env.smtpUser}>`,
    to,
    subject,
    text,
    html,
  });
  console.info(`[mail] sent "${subject}" to ${to} (${info.messageId})`);
  return { delivered: true };
}

export async function sendEmail({ to, subject, text, html }) {
  if (useBrevoApi) return sendViaBrevoApi({ to, subject, text, html });
  if (smtpConfigured) return sendViaSmtp({ to, subject, text, html });
  // Nothing configured — log the message so dev flows still see the link.
  console.info(`[mail] Email not configured — would send to ${to}: ${subject}`);
  console.info(`[mail] --- ${text}`);
  return { delivered: false, logged: true };
}

export function sendPasswordResetEmail({ email, name, resetUrl }) {
  const subject = "Reset your Liv password";
  const text = [
    `Hi ${name || "there"},`,
    "",
    "We received a request to reset your Liv password.",
    "Click the link below to choose a new one:",
    "",
    resetUrl,
    "",
    "This link expires in 30 minutes.",
    "If you didn't ask for this, you can safely ignore this email.",
    "",
    "— Liv",
  ].join("\n");
  const html = [
    `<p>Hi ${name || "there"},</p>`,
    "<p>We received a request to reset your Liv password.</p>",
    `<p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#0a84ff;color:#fff;text-decoration:none;border-radius:8px">Reset your password</a></p>`,
    `<p>Or paste this link: <a href="${resetUrl}">${resetUrl}</a></p>`,
    "<p>This link expires in <strong>30 minutes</strong>. If you didn't ask for this, you can safely ignore this email.</p>",
    "<p>— Liv</p>",
  ].join("");
  return sendEmail({ to: email, subject, text, html });
}