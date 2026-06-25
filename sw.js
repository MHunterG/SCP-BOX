/* SCP Terminal — service worker
   Стратегия:
   - HTML/CSS/JS/manifest: network-first (всегда свежие при наличии сети,
     кэш используется только как офлайн-фоллбэк) — чтобы обновления
     гарантированно доходили до установленного PWA.
   - изображения: cache-first (они большие и неизменные).
*/
const CACHE = "scp-terminal-v7";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./data.js",
  "./app.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./favicon-64.png",
  "./images/scp-049.jpg",
  "./images/scp-682.jpg",
  "./images/scp-106.jpg",
  "./images/scp-087.jpg",
  "./images/scp-914.jpg",
  "./images/scp-1471.jpg",
  "./images/scp-1981.jpg",
  "./images/scp-4999.jpg",
  "./images/scp-2000.jpg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isImage(url) { return /\/images\//.test(url) || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(url); }

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // изображения и иконки — cache-first
  if (sameOrigin && isImage(url.pathname)) {
    e.respondWith(
      caches.match(req).then((hit) =>
        hit || fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
      )
    );
    return;
  }

  // всё остальное (HTML/CSS/JS/manifest) — network-first
  e.respondWith(
    fetch(req).then((res) => {
      if (res && res.status === 200 && (res.type === "basic" || res.type === "cors")) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() =>
      caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("./index.html") : undefined))
    )
  );
});
