// A unique name for the cache. Increment this version when you update the app's core files.
const CACHE_NAME = 'friend-tracker-v53';

// Core local files required for offline operation
const CORE_LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './generated-image.jpg',
  './TimeTables/DF.json',
  './TimeTables/DG.json',
  './TimeTables/DH.json'
];

// External assets (Tailwind CDN, Fonts)
const EXTERNAL_STATIC_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// --- INSTALL Event ---
// Caches all essential assets with per-resource resilience (never fails install on single URL error)
self.addEventListener('install', event => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      console.log('[Service Worker] Pre-caching core local assets and dependencies');
      await Promise.allSettled(CORE_LOCAL_ASSETS.map(url => cache.add(url)));
      await Promise.allSettled(EXTERNAL_STATIC_ASSETS.map(url => cache.add(url)));
    }).then(() => {
      self.skipWaiting();
    })
  );
});

// --- ACTIVATE Event ---
// Cleans up previous cache versions and claims all clients immediately
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// --- FETCH Event ---
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = event.request.url;

  // 1. Navigation Requests (PWA / Browser Page Launch): CACHE FIRST for instant 0ms startup
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
        if (cachedResponse) {
          // Revalidate in background without delaying user
          fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
            }
          }).catch(() => {});
          return cachedResponse;
        }

        // Fallback to cached index.html or root
        return caches.match('./index.html').then(indexResponse => {
          if (indexResponse) return indexResponse;
          return caches.match('./').then(rootResponse => {
            if (rootResponse) return rootResponse;
            return fetch(event.request);
          });
        });
      }).catch(() => {
        return caches.match('./index.html') || caches.match('./');
      })
    );
    return;
  }

  // 2. Timetable JSON files: NETWORK FIRST with instant offline cache fallback
  if (url.includes('/TimeTables/') || url.includes('/timetables/') || url.endsWith('.json')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // If offline or network fails, serve cached copy instantly
          const cached = await caches.match(event.request, { ignoreSearch: true });
          if (cached) return cached;
          const cleanUrl = url.split('?')[0];
          return caches.match(cleanUrl, { ignoreSearch: true });
        })
    );
    return;
  }

  // 3. All other static assets (Tailwind CDN, Fonts, Images): CACHE FIRST with dynamic cache
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(event.request, { ignoreSearch: true });
      });
    })
  );
});
