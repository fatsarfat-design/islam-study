
// tajweed service worker (safe update) — v26
const CACHE = "tajweed-v26";
const CORE = [
  "./",
  "./index.html?v=25",
  "./styles.css?v=25",
  "./data.js?v=25",
  "./tests.js?v=25",
  "./app.js?v=25",
  "./manifest.json?v=26"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(CORE)).catch(()=>{})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();
  })());
});

// Network-first for navigation to avoid stale "empty app".
// Cache-first for static assets (with fallback to network).
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put("./", fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match("./");
        return cached || caches.match("./index.html?v=25");
      }
    })());
    return;
  }

  // same-origin only
  if (url.origin === location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone());
        return res;
      } catch (e) {
        return cached || new Response("Offline", { status: 503 });
      }
    })());
  }
});
