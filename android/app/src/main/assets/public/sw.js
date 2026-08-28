const CACHE_NAME = 'gestao-oeste-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/icon.svg',
  '/manifest.json'
];

// Install Event
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching Core Shell');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  // Exclude non-GET commands, API routes or external third-party tools
  if (
    e.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.includes('/api/') ||
    url.pathname.includes('google-firestore') ||
    url.pathname.includes('firebase')
  ) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // If we successfully fetch the asset, update our cache clone
        if (response.status === 200) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, resClone);
          });
        }
        return response;
      })
      .catch(() => {
        // If network request fails (offline), fall back to cached copy
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // For single-page navigation requests, return the root cache index.html
          if (e.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
