const CACHE = "vamshi-v2";
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

  // Never cache API or auth endpoints.
  if (request.method !== "GET" || url.pathname.startsWith(API)) {
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