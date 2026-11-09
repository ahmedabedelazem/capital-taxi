const CACHE_PREFIX = "capital-taxi-static-v1";
const STATIC_CACHE = CACHE_PREFIX;
const STATIC_PATHS = ["/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_PATHS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("capital-taxi-static-") && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Never cache API responses, authenticated pages, navigation, Firebase,
  // location data, or any non-GET request. These must remain network-fresh.
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/data/") ||
    request.mode === "navigate"
  ) {
    return;
  }

  const isImmutableNextAsset = url.pathname.startsWith("/_next/static/");
  const isAppIcon = url.pathname === "/icon.svg";
  if (!isImmutableNextAsset && !isAppIcon) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          void caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
