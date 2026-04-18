import { setupOfflineSync } from './offlineQueue';
import { replayQueuedRequest } from './auth';

// IndexedDB Configuration for offline data
const DB_NAME = 'sibms-offline-db';
const DB_VERSION = 1;
const STORES = {
  offlineRequests: 'offlineRequests',
  cachedAPI: 'cachedAPI',
  appData: 'appData',
};

let db = null;

/**
 * Initialize IndexedDB for offline data storage
 */
export async function initializeIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[PWA] IndexedDB initialization failed');
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('[PWA] IndexedDB initialized successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      console.log('[PWA] Upgrading IndexedDB schema');

      // Store for offline API requests
      if (!database.objectStoreNames.contains(STORES.offlineRequests)) {
        const store = database.createObjectStore(STORES.offlineRequests, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }

      // Store for cached API responses
      if (!database.objectStoreNames.contains(STORES.cachedAPI)) {
        const store = database.createObjectStore(STORES.cachedAPI, { keyPath: 'url' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('expiry', 'expiry', { unique: false });
      }

      // Store for application data
      if (!database.objectStoreNames.contains(STORES.appData)) {
        database.createObjectStore(STORES.appData, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Save API response to cache
 */
export async function cacheAPIResponse(url, data, ttlMinutes = 60) {
  if (!db) return;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.cachedAPI], 'readwrite');
    const store = transaction.objectStore(STORES.cachedAPI);

    const cacheEntry = {
      url,
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttlMinutes * 60 * 1000,
    };

    const request = store.put(cacheEntry);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log('[PWA] Cached API response:', url);
      resolve(cacheEntry);
    };
  });
}

/**
 * Retrieve cached API response
 */
export async function getCachedAPIResponse(url) {
  if (!db) return null;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.cachedAPI], 'readonly');
    const store = transaction.objectStore(STORES.cachedAPI);
    const request = store.get(url);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result;
      if (result && result.expiry > Date.now()) {
        console.log('[PWA] Retrieved cached API response:', url);
        resolve(result.data);
      } else {
        if (result) {
          // Delete expired entry
          store.delete(url);
        }
        resolve(null);
      }
    };
  });
}

/**
 * Store offline request in IndexedDB
 */
export async function storeOfflineRequest(item) {
  if (!db) return;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.offlineRequests], 'readwrite');
    const store = transaction.objectStore(STORES.offlineRequests);

    const request = store.add({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      path: item.path,
      method: item.method,
      headers: item.headers,
      body: item.body,
      timestamp: Date.now(),
      status: 'pending',
    });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log('[PWA] Offline request stored:', item.path);
      resolve(request.result);
    };
  });
}

/**
 * Get all pending offline requests
 */
export async function getPendingOfflineRequests() {
  if (!db) return [];

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.offlineRequests], 'readonly');
    const store = transaction.objectStore(STORES.offlineRequests);
    const index = store.index('status');
    const request = index.getAll('pending');

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log('[PWA] Retrieved pending requests:', request.result.length);
      resolve(request.result);
    };
  });
}

/**
 * Mark offline request as synced
 */
export async function markOfflineRequestAsSynced(id) {
  if (!db) return;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.offlineRequests], 'readwrite');
    const store = transaction.objectStore(STORES.offlineRequests);
    const request = store.get(id);

    request.onsuccess = () => {
      const item = request.result;
      item.status = 'synced';
      store.put(item);
    };

    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => {
      console.log('[PWA] Marked request as synced:', id);
      resolve();
    };
  });
}

/**
 * Clear old cached data
 */
export async function clearExpiredCache() {
  if (!db) return;

  return new Promise((resolve) => {
    const transaction = db.transaction([STORES.cachedAPI], 'readwrite');
    const store = transaction.objectStore(STORES.cachedAPI);
    const index = store.index('expiry');
    const request = index.openCursor(IDBKeyRange.upperBound(Date.now()));

    let deleted = 0;
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        deleted += 1;
        cursor.continue();
      } else {
        console.log('[PWA] Cleared expired cache entries:', deleted);
        resolve(deleted);
      }
    };
  });
}

/**
 * Register Service Worker
 */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service Workers not supported');
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('[PWA] Service Worker registered:', registration);

        // Check for updates periodically
        setInterval(() => {
          registration.update().catch((err) => {
            console.warn('[PWA] Failed to check for SW updates:', err);
          });
        }, 60000); // Check every minute

        // Handle new service worker ready
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              console.log('[PWA] New Service Worker activated');
              window.dispatchEvent(new Event('swupdated'));
            }
          });
        });

        resolve(registration);
      } catch (err) {
        console.warn('[PWA] Service Worker registration failed:', err);
        resolve(null);
      }
    });
  });
}

/**
 * Initialize offline sync
 */
export function initializeOfflineSync() {
  return setupOfflineSync({
    requestAdapter: replayQueuedRequest,
  });
}

/**
 * Enable background sync (requires service worker)
 */
export async function enableBackgroundSync() {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    console.warn('[PWA] Background Sync not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('sync-offline-queue');
    console.log('[PWA] Background sync registered');
    return true;
  } catch (err) {
    console.warn('[PWA] Background sync registration failed:', err);
    return false;
  }
}

/**
 * Initialize complete PWA experience
 */
export async function initializePWA() {
  console.log('[PWA] Initializing complete PWA experience');

  try {
    // Initialize IndexedDB
    await initializeIndexedDB();

    // Register Service Worker
    await registerServiceWorker();

    // Initialize Offline Sync
    initializeOfflineSync();

    // Enable Background Sync
    await enableBackgroundSync();

    // Clear expired cache
    await clearExpiredCache();

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('[PWA] Device is online');
      window.dispatchEvent(new Event('app-online'));
    });

    window.addEventListener('offline', () => {
      console.log('[PWA] Device is offline');
      window.dispatchEvent(new Event('app-offline'));
    });

    console.log('[PWA] PWA initialization complete');
    return true;
  } catch (err) {
    console.error('[PWA] PWA initialization failed:', err);
    return false;
  }
}
