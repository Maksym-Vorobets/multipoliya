const CACHE = "multipolia-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/css/variables.css",
  "/css/base.css",
  "/css/screens.css",
  "/js/i18n.js",
  "/js/state.js",
  "/js/app.js",
  "/assets/img/blackhole.png",
  "/assets/img/mars.png",
  "/assets/img/moon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const SKIP = ["/api/", "sockjs-node", "hot-update", "/ws"];

// Network-first: always fresh when online, cached shell when offline
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || SKIP.some((s) => url.pathname.includes(s))) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("/index.html")))
  );
});
