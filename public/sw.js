const CACHE_NAME = 'anglers-log-v2';
// These are the core files Vite generates that we want to keep offline
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/main.jsx',
  '/src/App.jsx',
  '/src/index.css',
  // Add your icon filename here once you have one in the public folder
  '/icon.png' 
];

// 1. Installation: Save all core files to the phone's storage
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Force the waiting service worker to become the active one immediately
  self.skipWaiting();
});

// 2. Activation: Clean up old versions of the app if the CACHE_NAME changed
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. Fetching: Try to load from cache first, then the network
self.addEventListener('fetch', (event) => {
  // We only cache GET requests (standard for app files)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return the cached version if we have it, otherwise go to the internet
      return cachedResponse || fetch(event.request).then((response) => {
        // Optional: Cache new resources as the user discovers them
        return response;
      }).catch(() => {
        // Fallback for when both cache and network fail (offline and not cached)
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});