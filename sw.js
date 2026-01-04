// islam-study service worker — v27
const VERSION = "27";
const CACHE = "islam-study-v" + VERSION;

const CORE = [
  "./",
  "./index.html?v=" + VERSION,
  "./styles.css?v=" + VERSION,
  "./data.js?v=" + VERSION,
  "./tests.js?v=" + VERSION,
  "./app.js?v=" + VERSION,
  "./manifest.json?v=" + VERSION
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

// Network-first for navigation, cache-first for static
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== location.origin) return;

  const isNav = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

  if (isNav) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(CACHE);
        cache.put("./index.html?v=" + VERSION, fresh.clone()).catch(() => {});
        return fresh;
      } catch (e) {
        const cached = await caches.match("./index.html?v=" + VERSION);
        return cached || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      const cache = await caches.open(CACHE);
      // cache only GET
      if (req.method === "GET") cache.put(req, res.clone()).catch(() => {});
      return res;
    } catch (e) {
      return cached || Response.error();
    }
  })());
});
