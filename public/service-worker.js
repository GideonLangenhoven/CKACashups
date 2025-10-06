/* Basic offline-first cache */
const CACHE_NAME = 'csk-cashups-v2';
const ASSETS = [
  '/',
  '/manifest.json',
  '/CKAlogo.png'
];

self.addEventListener('install', (event) => {
  // Activate the new worker immediately
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : undefined)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Let browser handle navigations (avoids redirect warnings on Next.js redirects)
  if (request.mode === 'navigate') return;

  // Don't cache auth or API routes
  if (request.url.includes('/api/') || request.url.includes('/auth/')) {
    return;
  }

  // Only cache same-origin
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) =>
      cached || fetch(request).then((res) => {
        // Don't cache redirects or errors; only cache basic, ok responses
        const shouldCache = res.ok && res.type === 'basic' && !res.redirected && res.status < 300;
        if (shouldCache) {
          const resClone = res.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone)));
        }
        return res;
      }).catch(() => cached)
    )
  );
});
