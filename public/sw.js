const CACHE_NAME = 'f1-night-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  // Cache core pages
  '/_next/static/css/',
  '/_next/static/chunks/',
  // Cache external resources
  'https://storage.googleapis.com/poker-enfermos/f1-logo.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('F1 Night: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('F1 Night: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Handle API requests differently
  if (event.request.url.includes('/api/')) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }

  // Handle static resources
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response;
        }

        // Fetch from network and cache
        return fetch(event.request)
          .then((response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone response for caching
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
          });
      })
  );
});

// Handle API requests with offline support
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const method = request.method;
  
  try {
    // Try network first for API requests
    const networkResponse = await fetch(request);
    
    // Cache GET requests for offline access
    if (method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('F1 Night: Network failed for API request:', url.pathname);
    
    // For GET requests, try to serve from cache
    if (method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.log('F1 Night: Serving API request from cache:', url.pathname);
        return cachedResponse;
      }
    }
    
    // For POST/PUT requests, store them for later sync
    if (method === 'POST' || method === 'PUT') {
      await storeOfflineRequest(request);
      
      // Return a success response to prevent app errors
      return new Response(
        JSON.stringify({ 
          success: true, 
          offline: true, 
          message: 'Request saved for sync when online' 
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Return error for other cases
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'No network connection available' 
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Store offline requests for later sync
async function storeOfflineRequest(request) {
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.text(),
    timestamp: Date.now()
  };
  
  // Store in IndexedDB (simplified version)
  try {
    const db = await openDB();
    const transaction = db.transaction(['offline-requests'], 'readwrite');
    const store = transaction.objectStore('offline-requests');
    await store.add(requestData);
    console.log('F1 Night: Stored offline request for later sync');
  } catch (error) {
    console.error('F1 Night: Failed to store offline request:', error);
  }
}

// Simple IndexedDB wrapper
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('f1-night-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('offline-requests')) {
        db.createObjectStore('offline-requests', { keyPath: 'timestamp' });
      }
    };
  });
}

// Listen for online events to sync offline requests
self.addEventListener('online', () => {
  console.log('F1 Night: Back online, syncing offline requests');
  syncOfflineRequests();
});

// Sync offline requests when back online
async function syncOfflineRequests() {
  try {
    const db = await openDB();
    const transaction = db.transaction(['offline-requests'], 'readwrite');
    const store = transaction.objectStore('offline-requests');
    const requests = await store.getAll();
    
    for (const requestData of requests) {
      try {
        const response = await fetch(requestData.url, {
          method: requestData.method,
          headers: requestData.headers,
          body: requestData.body
        });
        
        if (response.ok) {
          await store.delete(requestData.timestamp);
          console.log('F1 Night: Synced offline request:', requestData.url);
        }
      } catch (error) {
        console.error('F1 Night: Failed to sync request:', error);
      }
    }
  } catch (error) {
    console.error('F1 Night: Failed to sync offline requests:', error);
  }
}

// Background sync for when app is closed
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineRequests());
  }
});