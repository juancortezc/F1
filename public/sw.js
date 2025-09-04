// F1 Night Service Worker - Enhanced for iOS PWA
const CACHE_VERSION = 2;
const CACHE_NAME = `f1-night-v${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/icon-120.png',
  '/icon-152.png'
];

// Install - Cache essential files with better error handling
self.addEventListener('install', (event) => {
  console.log('F1 Night: Service worker installing');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('F1 Night: Caching essential files');
        // Try to cache files individually to avoid failing on missing files
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => 
              console.warn(`F1 Night: Failed to cache ${url}:`, err)
            )
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate - Clean old caches
self.addEventListener('activate', (event) => {
  console.log('F1 Night: Service worker activating');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('F1 Night: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - Network first strategy with iOS-specific handling
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Handle API requests differently - always network only
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => 
        new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response
        const responseToCache = response.clone();

        // Cache successful responses for static assets
        if (response.status === 200 && !event.request.url.includes('/api/')) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Network error', { status: 503 });
        });
      })
  );
});