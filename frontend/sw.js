/* TurnosYa — Service Worker (PWA offline) */
const CACHE = 'turnosya-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/login-negocio.html',
  '/admin.html',
  '/css/styles.css',
  '/js/app.js',
  '/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) return; // no cachear API
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
