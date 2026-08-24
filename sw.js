// A unique name for the cache. Increment this version when you update the app's core files.
const CACHE_NAME = 'friend-tracker-v13';

// List of core files to cache when the service worker is installed.
// These are the essential files needed for the app to run offline.
const urlsToCache = [
  './', // Caches the root URL of the app
  './index.html',
  './manifest.json',
  './generated-image.jpg' // App icon
];

// --- INSTALL Event ---
// This event fires when the service worker is first installed.
// It opens the cache and adds the core files to it.
self.addEventListener('install', event => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching all: app shell and content');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker.
        self.skipWaiting();
      })
  );
});

// --- ACTIVATE Event ---
// This event fires when the service worker is activated.
// It's a good place to clean up old caches.
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activate');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // If a cache's name is not the current one, delete it.
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Tell the active service worker to take control of the page immediately.
            return self.clients.claim();
        })
    );
});


// --- FETCH Event ---
// This event fires for every network request made by the page.
// It intercepts the request and decides how to respond.
self.addEventListener('fetch', event => {
  // We only want to handle GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  // For navigation requests (loading the HTML page), use a "stale-while-revalidate" strategy.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        // 1. Respond with the cached version immediately.
        return cache.match(event.request).then(cachedResponse => {
          // 2. In the background, fetch a fresh version from the network.
          const fetchPromise = fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              console.log('[Service Worker] Fetched & Caching new version for:', event.request.url);
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(error => {
            console.log('[Service Worker] Fetch failed; returning offline page instead.', error);
            return cachedResponse || caches.match('./index.html') || caches.match('./');
          });

          // Return the cached response if it exists, otherwise wait for the network to respond.
          return cachedResponse || fetchPromise;
        });
      })
    );
  } else {
    // For all other requests (CSS, JS, fonts, images), use a "cache-first" strategy.
    event.respondWith(
      caches.match(event.request).then(response => {
        // If the resource is in the cache, return it.
        if (response) {
          return response;
        }
        // If not in the cache, fetch it from the network.
        return fetch(event.request).then(networkResponse => {
          // And cache the new resource for future use.
          return caches.open(CACHE_NAME).then(cache => {
            console.log('[Service Worker] Caching new resource:', event.request.url);
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  }
});
