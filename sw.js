// A unique name for the cache
const CACHE_NAME = 'friend-tracker-v1';

// Make sure to replace 'your-repo-name' with your repository name
const REPO_NAME = 'your-repo-name';

// List of files to cache when the service worker is installed
const urlsToCache = [
  `/${REPO_NAME}/`,
  `/${REPO_NAME}/index.html`
];

// Install event: opens the cache and adds the core files to it.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event: serves requests from the cache if available.
// If not in the cache, it fetches from the network.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If the request is in the cache, return the cached response
        if (response) {
          return response;
        }
        // Otherwise, fetch the request from the network
        return fetch(event.request);
      }
    )
  );
});
