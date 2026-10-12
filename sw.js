// WiFi Pulse caches only its own static shell, never speed-test responses.
const CACHE = 'wifi-pulse-v3.5';
const PREFIX = 'wifi-pulse-';
const ASSETS = [
  './', './index.html', './styles.css', './game.css', './insights.css',
  './app.js', './insights.js', './manifest.webmanifest', './icon.svg'
];
const CORE_PATHS = new Set(ASSETS.map(asset => new URL(asset, self.location.href).pathname));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith(PREFIX) && key !== CACHE)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Speed tests and local health checks must bypass SW caching entirely.
  if (url.pathname.includes('/api/') ||
      url.pathname.startsWith('/.netlify/functions/') ||
      url.pathname.includes('/__down') ||
      url.pathname.includes('/__up')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(response => {
        if (!response.ok) throw new Error('Navigation unavailable');
        return response;
      }).catch(async () => {
        const cache = await caches.open(CACHE);
        return (await cache.match('./index.html')) || Response.error();
      })
    );
    return;
  }

  if (!CORE_PATHS.has(url.pathname)) return;
  event.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
      return response;
    })
  );
});
