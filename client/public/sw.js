const CACHE_VERSION = 'v3';
const STATIC_CACHE = `amaanah-static-${CACHE_VERSION}`;
const DATA_CACHE = `amaanah-data-${CACHE_VERSION}`;

const APP_SHELL = [
  '/',
  '/index.html',
];

const CACHEABLE_API_PREFIXES = [
  '/api/schools',
  '/api/students',
  '/api/results',
  '/api/staff-profiles',
  '/api/regions',
  '/api/clusters',
  '/api/centers',
  '/api/subjects',
  '/api/exam-years',
  '/api/examiners',
  '/api/notifications',
  '/api/exam-schedule',
  '/api/timetable',
  '/api/exam-packets',
  '/api/certificates',
  '/api/transcripts',
  '/api/auth/user',
  '/api/public',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('amaanah-') && !k.endsWith(CACHE_VERSION))
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

function isCacheableApi(url) {
  return CACHEABLE_API_PREFIXES.some(prefix => url.pathname.startsWith(prefix));
}

async function networkFirstWithCache(request) {
  const cache = await caches.open(DATA_CACHE);
  try {
    const networkResponse = await fetch(request.clone());
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline', message: 'No cached data available' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'X-Offline': 'true' }
    });
  }
}

async function cacheFirstWithNetwork(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const root = await cache.match('/');
    if (root) return root;
    return new Response('Offline', { status: 503 });
  }
}

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;
  if (request.method !== 'GET') return;

  if (url.pathname.startsWith('/api/')) {
    if (isCacheableApi(url)) {
      event.respondWith(networkFirstWithCache(request));
    }
    return;
  }

  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|ttf)$/)) {
    event.respondWith(cacheFirstWithNetwork(request));
    return;
  }

  if (!url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match('/');
        return cached || new Response('Offline', { status: 503 });
      })
    );
  }
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data === 'clearCache') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});
