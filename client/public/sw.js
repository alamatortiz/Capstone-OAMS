// Minimal Web Push service worker. Lives at the site root so its scope
// covers the whole app (a worker registered from a subpath can only control
// pages under that subpath).
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "OAMS", {
      body: data.body || "",
      icon: "/favicon.png",
      data: data.data || {},
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});
