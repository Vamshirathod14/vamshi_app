const CACHE = "vamshi-push-v1";
const SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];
const API = "/api";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never touch API, auth, or cross-origin requests (ads, fonts, images from
  // Google etc. must NOT go through the service worker — that breaks content
  // security policy and pollutes the cache).
  if (request.method !== "GET" || url.pathname.startsWith(API)) {
    return;
  }
  if (url.origin !== self.location.origin) {
    return;
  }

  // Navigation requests: network-first, fall back to cached shell.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put("/", copy));
            return res;
          }
          if (res) return res;
        } catch {
          // network failure — fall through to cache
        }
        const shell =
          (await caches.match("/")) || (await caches.match("/index.html"));
        if (shell) return shell;
        return new Response(
          "<!doctype html><html><head><meta charset='utf-8'><title>Vamshi</title></head><body style='font-family:system-ui;padding:2rem;text-align:center'><h2>You're offline</h2><p>Check your connection and try again.</p></body></html>",
          { headers: { "Content-Type": "text/html; charset=utf-8" } },
        );
      })(),
    );
    return;
  }

  // Everything else: stale-while-revalidate.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      try {
        const res = await fetch(request);
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return res;
      } catch {
        if (cached) return cached;
        return Response.error();
      }
    })(),
  );
});

// ---------------- Web Push ----------------

// Only routes the app actually owns. Used to build the notification click
// target — never external, never user-supplied.
const INTERNAL_ROUTES = new Set([
  "/",
  "/dashboard",
  "/reminders",
  "/tasks",
  "/notifications",
  "/settings",
]);

function coerceUrl(raw) {
  if (typeof raw !== "string") return "/";
  const path = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/" + raw;
  const first = path.split("?")[0].split("#")[0];
  if (INTERNAL_ROUTES.has(first)) return path;
  return "/";
}

// Report back to the server so a push that reaches the device is provable in
// the logs: deliveryId/type and whether showNotification succeeded. Failures to
// report are swallowed — this is diagnostic-only and must never break delivery.
async function reportPushAck(data, shown) {
  try {
    await fetch("/api/notifications/push/ack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryId: data.deliveryId || null,
        type: data.type || "system",
        shown,
      }),
    });
  } catch {
    // ignore
  }
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? (event.data.json() || {}) : {};
  } catch {
    data = {};
  }
  const type = String(data.type || "system");
  const title = data.title || (type === "test" ? "Vamshi Notifications" : "Vamshi");
  const alarm = data.alarm === true;
  // Alarm ticks share one tag so each repeat replaces the last — one bumping
  // notification that buzzes/sounds again rather than a pile of duplicates.
  const base = {
    body: data.body || "You have a new update in Vamshi.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: alarm
      ? `vamshi-alarm-${data.referenceId || data.deliveryId}`
      : data.tag || data.deliveryId || `vamshi-${type}`,
    renotify: true,
    ...(alarm ? { requireInteraction: true } : {}),
    data: {
      url: coerceUrl(data.url),
      type,
      deliveryId: data.deliveryId || null,
      referenceId: data.referenceId || null,
      alarm,
    },
  };
  if (alarm) base.vibrate = [250, 120, 250, 120, 500, 120, 250];
  const ts = Number(data.timestamp);
  if (Number.isFinite(ts) && ts > 0) base.timestamp = ts;
  if (data.requireInteraction) base.requireInteraction = true;

  event.waitUntil(
    (async () => {
      let shown = false;
      try {
        await self.registration.showNotification(title, base);
        shown = true;
      } catch (err) {
        console.error("[sw] showNotification failed:", err);
        // Minimal fallback — some Safari/iOS builds reject rich option sets
        // (badge/renotify/timestamp). Never let a lost popup fail silently.
        try {
          await self.registration.showNotification(title, {
            body: base.body,
            data: base.data,
            ...(alarm ? { vibrate: base.vibrate } : {}),
          });
          shown = true;
        } catch (e2) {
          console.error("[sw] fallback showNotification failed:", e2);
        }
      }
      reportPushAck(data, shown);
      // Mirror to any open app window (handy for debugging in-device).
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const c of clients) {
        try {
          c.postMessage({
            type: alarm ? "vamshi-alarm" : "vamshi-push",
            title,
            body: base.body,
            shown,
            referenceId: data.referenceId || null,
          });
        } catch {
          // ignore
        }
      }
    })(),
  );
});

self.addEventListener("notificationclose", () => {
  // Not actionable per spec (data cleared after close) — kept for completeness.
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const nd = event.notification.data || {};
  const target = coerceUrl(nd.url);
  const targetUrl = new URL(target, self.location.origin).href;
  const referenceId = nd.referenceId;

  // Alarm tap = dismiss. Tell the server immediately so the ring stops even
  // before the app finishes opening. Best-effort.
  if (referenceId && (nd.alarm || nd.type === "reminder")) {
    try {
      fetch("/api/notifications/push/ack-alarm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderId: referenceId }),
        credentials: "same-origin",
      }).catch(() => {});
    } catch {
      // ignore
    }
  }

  event.waitUntil(
    (async () => {
      // Reuse an already-open app window, else open one.
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clients) {
        if (client.url && client.url.startsWith(self.location.origin)) {
          await client.focus();
          try {
            await client.navigate(targetUrl);
          } catch {
            // page may be in-app; focusing was enough
          }
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});