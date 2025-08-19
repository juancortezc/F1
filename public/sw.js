// F1 Night Service Worker - Minimal version
const CACHE_NAME = 'f1-night-minimal';

// Install - skip waiting to update immediately
self.addEventListener('install', () => {
  console.log('F1 Night: Service worker installed');
  self.skipWaiting();
});

// Activate - take control immediately
self.addEventListener('activate', (event) => {
  console.log('F1 Night: Service worker activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - simple pass-through with error handling
self.addEventListener('fetch', (event) => {
  // Pass through all requests without caching, with error handling
  event.respondWith(
    fetch(event.request).catch((error) => {
      console.warn('SW fetch failed:', error);
      // Return a basic response for failed requests
      return new Response('Network error', { status: 503 });
    })
  );
});