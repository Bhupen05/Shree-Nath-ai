self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open("sibms-static-v1"));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cache = await caches.open("sibms-static-v1");
      const cached = await cache.match(event.request);
      return cached ?? Response.error();
    })
  );
});
