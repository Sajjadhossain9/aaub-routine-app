const CACHE = "flightplan-v1";
const ASSETS = ["./", "./index.html", "./style.css", "./routine-data.js", "./app.js", "./manifest.json"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match("./index.html"))));
});

self.addEventListener("message", event => {
  if (event.data?.type === "SHOW_NOTIFICATION") {
    self.registration.showNotification(event.data.title, {
      body: event.data.body,
      icon: event.data.icon,
      badge: event.data.icon,
      tag: event.data.tag,
      renotify: false,
      data: { url: "./" }
    });
  }
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    const open = list.find(client => "focus" in client);
    return open ? open.focus() : clients.openWindow(event.notification.data?.url || "./");
  }));
});
