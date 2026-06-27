// Chalk service worker
// Handles: install/activate lifecycle, push notifications, notification click routing.
// NOTE: this is a hand-written SW (no Workbox) to keep full control over push payloads
// and avoid the cache-size build issues that come with auto-generated PWA tooling.

const CACHE_NAME = "chalk-static-v2";
const STATIC_ASSETS = ["/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Cache only public, immutable assets. Authenticated pages and API responses must never
// be persisted because another account can use the same browser profile later.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const cacheable =
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname === "/manifest.json");
  if (!cacheable) return;

  event.respondWith(caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
      }
      return response;
    });
  }));
});

// ── Push notifications ──
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Chalk", body: event.data.text() };
  }

  const title = payload.title || "New chalk message";
  const options = {
    body: payload.body || "Someone left you a message.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    image: payload.image, // optional preview of the drawing
    data: {
      url: payload.url || "/",
      circleId: payload.circleId,
      boardId: payload.boardId,
    },
    vibrate: [80, 40, 80],
    tag: payload.circleId ? `circle-${payload.circleId}` : undefined,
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
