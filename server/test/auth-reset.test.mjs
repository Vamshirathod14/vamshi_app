import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";

process.env.MONGODB_URI = "mongodb://localhost:27017/auth_reset_test";
process.env.MONGODB_DB = "auth_reset_test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-reset";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-reset";
process.env.CLIENT_ORIGIN = "http://localhost:5173";

const { createApp } = await import("../src/app.js");
const { default: mongoose } = await import("mongoose");
const { User } = await import("../src/models/User.js");
const { connectDb } = await import("../src/config/db.js");

let server;
let base;

const hashResetToken = (token) =>
  createHash("sha256").update(token).digest("hex");

async function api(path, { method = "GET", body } = {}) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(base + path, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, res };
}

async function register(email) {
  return api("/api/auth/register", {
    method: "POST",
    body: { name: email.split("@")[0], email, password: "oldpass123" },
  });
}

before(async () => {
  await connectDb();
  const app = createApp();
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test("forgot-password returns a generic message whether or not the email exists", async () => {
  await register("alice@reset.dev");
  const forKnown = await api("/api/auth/forgot-password", {
    method: "POST",
    body: { email: "alice@reset.dev" },
  });
  assert.equal(forKnown.status, 200);
  assert.match(forKnown.data.message, /reset link/i);

  const forUnknown = await api("/api/auth/forgot-password", {
    method: "POST",
    body: { email: "ghost@nowhere.dev" },
  });
  assert.equal(forUnknown.status, 200);
  assert.equal(forUnknown.data.message, forKnown.data.message, "reply is identical");
});

test("reset-password sets a new password and kills the old one", async () => {
  await register("bob@reset.dev");
  const token = randomBytes(32).toString("hex");
  const user = await User.findOne({ email: "bob@reset.dev" });
  user.passwordResetTokenHash = hashResetToken(token);
  user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  const res = await api("/api/auth/reset-password", {
    method: "POST",
    body: { token, newPassword: "newpass456" },
  });
  assert.equal(res.status, 200);
  assert.match(res.data.message, /sign in/i);

  const cleared = await User.findById(user._id);
  assert.equal(cleared.passwordResetTokenHash, null, "reset token is cleared");
  assert.equal(cleared.passwordResetExpires, null);

  const oldLogin = await api("/api/auth/login", {
    method: "POST",
    body: { email: "bob@reset.dev", password: "oldpass123" },
  });
  assert.equal(oldLogin.status, 401, "old password no longer works");

  const newLogin = await api("/api/auth/login", {
    method: "POST",
    body: { email: "bob@reset.dev", password: "newpass456" },
  });
  assert.equal(newLogin.status, 200, "new password works");
});

test("reset-password rejects an expired token", async () => {
  await register("carol@reset.dev");
  const token = randomBytes(32).toString("hex");
  const user = await User.findOne({ email: "carol@reset.dev" });
  user.passwordResetTokenHash = hashResetToken(token);
  user.passwordResetExpires = new Date(Date.now() - 60 * 1000);
  await user.save();

  const res = await api("/api/auth/reset-password", {
    method: "POST",
    body: { token, newPassword: "brandnew789" },
  });
  assert.equal(res.status, 400);
  assert.match(res.data.message, /invalid or has expired/i);
});