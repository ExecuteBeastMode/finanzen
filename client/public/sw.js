// Life OS — Service Worker für Push-Benachrichtigungen
const CACHE_NAME = "lifeos-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(clients.claim()));

// ── Push-Event: kommt vom Server oder von scheduled notifications ──────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = { title: "Life OS", body: event.data.text() }; }

  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    tag: payload.tag || "lifeos-notification",
    data: { url: payload.url || "/" },
    requireInteraction: false,
    silent: false,
  };

  event.waitUntil(self.registration.showNotification(payload.title || "Life OS", options));
});

// ── Notification click: öffne App ─────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(self.location.origin + targetUrl);
    })
  );
});

// ── Scheduled check: wird von der App via postMessage getriggert ───────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "CHECK_NOTIFICATIONS") {
    // App sendet die Daten — Service Worker zeigt die Notification
    const { notifications } = event.data;
    if (!notifications || notifications.length === 0) return;
    notifications.forEach((n) => {
      self.registration.showNotification(n.title, {
        body: n.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-72.png",
        tag: n.tag || "lifeos",
        data: { url: n.url || "/" },
        requireInteraction: false,
      });
    });
  }
});
