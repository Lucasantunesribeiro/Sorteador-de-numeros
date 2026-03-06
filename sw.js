const CACHE = 'lgs-v2';
const PRECACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/js/main.js',
  '/js/audio.js',
  '/js/storage.js',
  '/js/ui.js',
  '/js/stats.js',
  '/js/games/number-guess.js',
  '/js/games/memory.js',
  '/js/games/rng.js',
  '/js/games/odd-even.js',
  '/js/games/reaction.js',
  '/js/games/mastermind.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Cache-first for same-origin, network for external (fonts, etc.)
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return response;
      });
    })
  );
});
