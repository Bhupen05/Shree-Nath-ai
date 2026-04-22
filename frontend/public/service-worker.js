// SIBMS PWA Service Worker v2
// Offline-first strategy with intelligent caching

const CACHE_VERSION = 'v2';
const SHELL_CACHE = `sibms-shell-${CACHE_VERSION}`;
const API_CACHE = `sibms-api-${CACHE_VERSION}`;
const STATIC_CACHE = `sibms-static-${CACHE_VERSION}`;

// Core app shell (required for offline operation)
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
];

// Service Worker Installation
self.addEventListener('install', (event) => {
  console.log('[SW] Installing SIBMS Service Worker v2');
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then((cache) => {
        console.log('[SW] Caching core app shell');
        return cache.addAll(CORE_ASSETS).catch((err) => {
          console.warn('[SW] Failed to cache some core assets:', err);
        });
      }),
    ]).then(() => {
      console.log('[SW] Installation complete');
      self.skipWaiting();
    })
  );
});

// Service Worker Activation
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating SIBMS Service Worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      console.log('[SW] Cleaning up old caches:', cacheNames);
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName === SHELL_CACHE ||
            cacheName === API_CACHE ||
            cacheName === STATIC_CACHE
          ) {
            return null;
          }
          console.log('[SW] Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Request Interception & Caching Strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const destination = request.destination;

  // Skip non-GET requests and external origins
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // API Requests: Network-first with fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
  }
  // Static Assets: Cache-first with fallback to network
  else if (
    destination === 'script' ||
    destination === 'style' ||
    destination === 'image' ||
    destination === 'font' ||
    url.pathname.match(/\.(js|mjs|cjs|jsx|ts|tsx|css|svg|png|jpg|jpeg|gif|webp|woff|woff2)$/i) ||
    url.pathname === '/manifest.webmanifest'
  ) {
    event.respondWith(handleStaticRequest(request));
  }
  // HTML navigation requests: Network-first with fallback to cache
  else if (request.mode === 'navigate' || destination === 'document') {
    event.respondWith(handleHTMLRequest(request));
  }
  // Default: Cache-first for everything else
  else {
    event.respondWith(handleDefaultRequest(request));
  }
});

// Network-first strategy for API calls
async function handleAPIRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request.clone());
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch {
    // Fallback to cache on network failure
    console.log('[SW] API request failed, using cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Mark response as from cache
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-From-Cache', 'true');
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: headers,
      });
    }
    
    // Return offline response
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'No cached data available. Please try again when online.',
        offline: true,
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Cache-first strategy for static assets
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request.clone());
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch {
    console.log('[SW] Static asset fetch failed:', request.url);
    return new Response('Asset not available offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// Network-first strategy for HTML
async function handleHTMLRequest(request) {
  try {
    const networkResponse = await fetch(request.clone());
    if (networkResponse.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    console.log('[SW] HTML request failed, using cache:', request.url);
    const cachedResponse = await caches.match(request);
    return cachedResponse || caches.match('/');
  }
}

// Default fallback strategy
async function handleDefaultRequest(request) {
  try {
    return await fetch(request.clone());
  } catch {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response('Resource unavailable while offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

// Background Sync for offline requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-queue') {
    console.log('[SW] Syncing offline queue...');
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SYNC_OFFLINE_QUEUE',
          });
        });
      })
    );
  }
});

// Message handler for client communication
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting triggered');
    self.skipWaiting();
  }
});
