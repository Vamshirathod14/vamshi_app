# Vamshi — Deployment Guide

Private, production-ready **Vamshi** personal finance & life management PWA.
Recommended stack:

- **Frontend → Vercel** (React/Vite PWA in `client/`)
- **Backend → Render** (Express/Node in `server/`)
- **Database → MongoDB Atlas**
- **Source → private GitHub repo**

---

## 1. Architecture & Cookie Auth

Auth uses HttpOnly cookies (`accessToken` + `refreshToken`, rotated) with
`SameSite=Lax`. Safari on iPhone limits third-party cookies, so the frontend and
API must appear **same-origin** to the browser.

Recommended: **Vercel rewrite proxy.** `client/vercel.json` forwards `/api/*`
and `/uploads/*` server-side to the Render backend. The browser only ever talks
to the Vercel domain, so cookies stay same-origin and `SameSite=Lax` works:

```
Browser ──→ Vercel (https://vamshi.vercel.app)
                 │  /api/*  ,  /uploads/*  (server-side proxy)
                 └──→ Render (https://vamshi-backend.onrender.com)
MongoDB Atlas ◄────── Render
```

With this setup `VITE_API_URL` stays **empty** (requests use relative `/api`).

> **Before deploying**: edit `client/vercel.json` and replace
> `https://vamshi-backend.onrender.com` (both rewrite rules) with your actual
> Render URL. Your real host appears after step 6.

Alternative (no proxy): set `VITE_API_URL=https://<render-host>` at frontend
build time, backend `CLIENT_ORIGIN=https://<vercel-host>` and
`COOKIE_SAME_SITE=none` + `COOKIE_SECURE=true`. Cookies may be restricted on iOS
Safari; the proxy approach is preferred.

---

## 2. Environment Variables

`server/.env.example` and `client/.env.example` list all variables with
placeholders. **Never commit real values** (`.gitignore` excludes `.env*`).

### Backend (set on Render)

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | ✅ | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/vamshi?retryWrites=true&w=majority` |
| `JWT_ACCESS_SECRET` | ✅ | `openssl rand -hex 48` |
| `JWT_REFRESH_SECRET` | ✅ | `openssl rand -hex 48` |
| `NODE_ENV` | ✅ | `production` |
| `PORT` | | Render injects `PORT`; default `3001` |
| `COOKIE_SECURE` | ✅ | `true` |
| `COOKIE_SAME_SITE` | | `lax` (recommended) |
| `CLIENT_ORIGIN` | ✅ | `https://<your-vercel-domain>` |
| `BOOTSTRAP_EMAIL` / `BOOTSTRAP_PASSWORD` | ⚠️ | Initial account created only when DB is empty. Use strong values, then change to real credentials before public use. |
| `MAX_RECEIPT_SIZE_MB` | | default `5` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | | Required for notifications |

### Frontend (set on Vercel)

| Variable | Notes |
|---|---|
| `VITE_API_URL` | Leave **empty** when using the Vercel rewrite proxy. |

---

## 3. Local Development

Prerequisite: `mongod` running locally, `node >= 20`.

```bash
npm install
npm run dev        # server :3001 + client :5173 (Vite auto-increments if taken)
```

First boot prints the seeded demo account in the server log (dev only).

---

## 4. Production Build

```bash
npm install
npm run build      # builds client -> client/dist
```

---

## 5. MongoDB Atlas Setup

1. Create a cluster → build a database named **`vamshi`**.
2. **Database Access** → add a user with read/write for the app.
3. **Network Access** → allow your IPs (Render uses IP-allowlists; if egress is
   dynamic, allow `0.0.0.0/0` and rely on strong credentials).
4. Copy the connection string into `MONGODB_URI` (backend env). The URL contains
   the DB password — keep it in the platform env, never in git.

The backend creates collections, unique indexes, and seeds default categories +
the bootstrap user only when the database is empty. Existing data is never
deleted or reset.

Verify Atlas connectivity:
```bash
curl https://<render-host>/api/health
# {"ok":true,"service":"vamshi-server"}
```

---

## 6. Backend Deployment (Render)

1. Push the repo to GitHub (private).
2. Render → **New → Web Service** → connect the repo.
3. Settings:
   - **Root directory**: *(leave empty — root)*
   - **Build command**: `npm install && npm run build`
   - **Start command**: `npm run start`
   - **Environment**: add all backend variables from §2.
   - **Health Check Path**: `/api/health`
4. Deploy. Render auto-deploys on every push to the connected branch.

---

## 7. Frontend Deployment (Vercel)

1. Vercel → **Import Project** → your repo.
2. **Root directory**: `client`
3. Build settings (auto-detected):
   - Build: `npm run build`, Output: `dist`
4. Update `client/vercel.json` rewrite destinations to your real Render host and
   deploy (or deploy first with placeholders, then fix and redeploy — one click).
5. **Rewrite with `vercel.json` affects only new deployments.** Vercel
   auto-deploys on push.

Your iPhone will open `https://<you>.vercel.app` and everything (static assets,
`/api`, `/uploads`) is served from that single origin.

---

## 8. CORS

- Allowed origins come from `CLIENT_ORIGIN` (comma-separated, no wildcard).
- The Vercel proxy forwards requests server-side, so CORS is mostly bypassed;
  it still protects any direct client→API calls and cross-origin tooling.

---

## 9. HTTPS

- Vercel and Render provide HTTPS automatically; both redirect to HTTPS.
- `COOKIE_SECURE=true` on Render (cookies sent only over HTTPS).
- Atlas uses TLS by default (`mongodb+srv`).

---

## 10. PWA Installation

The client is a full PWA:

- `manifest.webmanifest` — `name`/`short_name` **Vamshi**, `display: standalone`.
- Icons — `icon-192` / `icon-512` / `apple-touch-icon` (V logo).
- `sw.js` — app-shell + stale-while-revalidate; **never caches `/api`** (personal
  data stays uncached). Bump `const CACHE = "vamshi-vX"` on each release so
  clients update immediately.

iPhone:

1. Safari → open the Vercel URL.
2. **Share → Add to Home Screen** → label **Vamshi**, V icon.
3. Open from Home Screen → standalone experience.

---

## 11. Notifications (Installable PWA — iPhone)

Implemented with `web-push`; requires VAPID keys:

```bash
npx web-push generate-vapid-keys
```

1. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` on Render.
2. In the app: **Settings → Notifications** must be enabled.
3. iOS requires the app be **added to the Home Screen** and running in the
   background. Test on a physical iPhone: create a reminder a few minutes out,
   background the app, and confirm the banner arrives; tapping it opens the app.

---

## 12. GitHub Safety

- `.gitignore` excludes `node_modules/`, `dist/`, `uploads/`, `.env`, `.env.*`
  (keeps `.env.example`), `*.log`, `.DS_Store`, `.vite/`.
- Review `git status`/`git diff` before each push; never commit `.env` or
  credentials. Keep the repo **private**.

---

## 13. Redeploy & Update

1. Pull latest code; bump `client/public/sw.js` cache version.
2. Push → Render + Vercel auto-deploy.
3. Verify `/api/health`, login, and one real transaction.

---

## 14. Security Checklist

- [ ] Repo is private; no `.env`/credentials committed.
- [ ] Strong unique JWT secrets (`openssl rand -hex 48`).
- [ ] `COOKIE_SECURE=true`; HTTPS everywhere.
- [ ] `CLIENT_ORIGIN` set to the real Vercel domain.
- [ ] Atlas user limited to the `vamshi` database.
- [ ] `BOOTSTRAP_*` demo credentials replaced/removed before public use.
- [ ] `VAPID_PRIVATE_KEY` only in Render env, never committed.
- [ ] `vercel.json` rewrite destinations point to the real Render host.