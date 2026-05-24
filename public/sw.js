const CACHE_NAME = "life-os-v2";
const APP_SHELL = ["/offline", "/manifest.webmanifest", "/icon-192", "/icon-512"];

function shouldBypassCache(request) {
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return true;
  if (url.pathname.startsWith("/_next/")) return true;
  if (url.pathname.startsWith("/api/")) return true;
  if (url.pathname === "/sw.js") return true;
  if (request.headers.get("rsc") === "1") return true;
  if (request.headers.get("next-router-prefetch")) return true;
  if (request.headers.get("next-router-state-tree")) return true;

  return false;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.allSettled(APP_SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) => clients.forEach((client) => client.navigate(client.url)))
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (shouldBypassCache(request)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match("/offline"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();

  if (event.data?.type === "SHOW_TEST_NOTIFICATION") {
    event.waitUntil(
      self.registration.showNotification("Life OS notifications are on", {
        body: "You will be able to receive reminders from Life OS.",
        icon: "/icon-192",
        badge: "/icon",
        tag: "life-os-test",
        data: { url: "/dashboard" },
      })
    );
  }

  if (event.data?.type === "SHOW_REMINDER_NOTIFICATION") {
    const reminder = event.data.reminder || {};
    event.waitUntil(
      self.registration.showNotification(reminder.title || "Life OS reminder", {
        body: reminder.body || "Open Life OS and complete the pending item.",
        icon: "/icon-192",
        badge: "/icon",
        tag: reminder.id || "life-os-reminder",
        renotify: true,
        requireInteraction: !!event.data.requireInteraction,
        data: { url: reminder.url || "/dashboard" },
        actions: [
          { action: "open", title: "Open" },
        ],
      })
    );
  }
});

self.addEventListener("push", (event) => {
  const fallback = {
    title: "Life OS",
    body: "You have a new reminder.",
    url: "/dashboard",
  };

  const payload = event.data ? event.data.json() : fallback;
  event.waitUntil(
    self.registration.showNotification(payload.title || fallback.title, {
      body: payload.body || fallback.body,
      icon: payload.icon || "/icon-192",
      badge: payload.badge || "/icon",
      tag: payload.tag || "life-os-reminder",
      data: { url: payload.url || fallback.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
