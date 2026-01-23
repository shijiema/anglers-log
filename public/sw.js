const CACHE_NAME = 'anglers-log-v4';

// Core assets to pre-cache (app shell)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg'
];

// Install event - pre-cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SW: Pre-caching app shell');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('SW: Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - network first with cache fallback for most requests
// Cache first for static assets (js, css, images)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (like external APIs, maps, etc.)
  if (url.origin !== location.origin) return;

  // For static assets (js, css, images, fonts) - use cache first strategy
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // For HTML/navigation requests - use network first with cache fallback
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // For everything else - network first, cache as fallback
  event.respondWith(networkFirst(request));
});

// Check if request is for a static asset
function isStaticAsset(pathname) {
  return /\.(js|css|svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot|ico)$/i.test(pathname) ||
         pathname.startsWith('/assets/');
}

// Cache first strategy - good for versioned static assets
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('SW: Fetch failed for static asset:', request.url);
    // Return a placeholder or error response if needed
    return new Response('Asset not available offline', { status: 503 });
  }
}

// Network first strategy - good for dynamic content
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    return new Response('Content not available offline', { status: 503 });
  }
}

// Network first with offline fallback to app shell
async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('SW: Network failed, serving from cache');

    // Try to get the exact page from cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Fall back to the app shell (index.html) for SPA routing
    const fallback = await caches.match('/index.html');
    if (fallback) {
      return fallback;
    }

    return new Response('App not available offline. Please connect to the internet and reload.', {
      status: 503,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
