const BASE = import.meta.env.VITE_API_URL || "";

export class ApiError extends Error {
  constructor(message, status, details, code) {
    super(message);
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

async function request(path, { method = "GET", body, headers = {}, raw = false } = {}) {
  const opts = { method, headers: { ...headers }, credentials: "include" };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, opts);
  } catch {
    throw new ApiError("You appear to be offline. Check your connection and try again.", 0);
  }

  if (res.status === 401 && !path.startsWith("/api/auth")) {
    // try to refresh the session once, then retry
    const refreshed = await attemptRefresh();
    if (refreshed) return request(path, { method, body, headers, raw });
    window.dispatchEvent(new CustomEvent("vault:logged-out"));
    throw new ApiError("Session expired. Please sign in again.", 401);
  }

  if (raw) return res;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      data.message || "Something went wrong. Please try again.",
      res.status,
      data.details,
      data.code,
    );
  }
  return data;
}

let refreshing = null;
async function attemptRefresh() {
  if (refreshing) return refreshing;
  refreshing = fetch(`${BASE}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

// Restore a session from the long-lived refresh cookie (Instagram-style:
// sign in once, and returning to the app silently logs you back in).
// Returns the user object, or null when the refresh cookie is gone/expired.
export async function refreshSession() {
  try {
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  del: (path) => request(path, { method: "DELETE" }),
  raw: (path, opts) => request(path, { ...opts, raw: true }),

  upload: async (path, formData) => {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.message || "Upload failed.", res.status);
    return data;
  },
};