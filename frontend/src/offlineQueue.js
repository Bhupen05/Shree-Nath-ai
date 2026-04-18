import { storeOfflineRequest, markOfflineRequestAsSynced } from './pwa.js';

const OFFLINE_QUEUE_KEY = 'sibms_offline_queue_v2';

// In-memory queue for fast access
let memoryQueue = [];

function readQueue() {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items) {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
    memoryQueue = items;
  } catch (err) {
    console.warn('[OfflineQueue] Failed to write queue to localStorage:', err);
  }
}

/**
 * Enqueue an offline request (both localStorage and IndexedDB)
 */
export async function enqueueOfflineRequest(item) {
  const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  
  const queueItem = {
    id,
    createdAt: new Date().toISOString(),
    ...item,
  };

  // Write to localStorage (primary storage)
  const queue = readQueue();
  queue.push(queueItem);
  writeQueue(queue);

  // Write to IndexedDB (backup storage)
  try {
    await storeOfflineRequest(item);
  } catch (err) {
    console.warn('[OfflineQueue] Failed to store in IndexedDB:', err);
  }

  console.log('[OfflineQueue] Request enqueued:', id, 'Total:', queue.length);
  return queue.length;
}

/**
 * Get the size of the offline queue
 */
export function getOfflineQueueSize() {
  if (memoryQueue.length > 0) {
    return memoryQueue.length;
  }
  return readQueue().length;
}

/**
 * Get all pending requests
 */
export function getPendingRequests() {
  return memoryQueue.length > 0 ? memoryQueue : readQueue();
}

/**
 * Flush offline queue and sync with server
 */
export async function flushOfflineQueue({ requestAdapter }) {
  if (navigator.onLine === false) {
    console.log('[OfflineQueue] Device is offline, queue will be flushed later');
    return { flushed: 0, failed: 0, remaining: getOfflineQueueSize() };
  }

  const pending = getPendingRequests();
  if (!pending.length) {
    console.log('[OfflineQueue] No pending requests');
    return { flushed: 0, failed: 0, remaining: 0 };
  }

  console.log('[OfflineQueue] Flushing queue with', pending.length, 'requests');

  const remaining = [];
  let flushed = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      await requestAdapter(item.path, {
        method: item.method,
        headers: item.headers,
        body: item.body,
      });
      
      flushed += 1;
      
      // Mark as synced in IndexedDB
      try {
        await markOfflineRequestAsSynced(item.id);
      } catch (err) {
        console.warn('[OfflineQueue] Failed to mark synced in IndexedDB:', err);
      }
      
      console.log('[OfflineQueue] Synced:', item.path);
    } catch (err) {
      failed += 1;
      remaining.push(item);
      console.warn('[OfflineQueue] Failed to sync:', item.path, err.message);
    }
  }

  writeQueue(remaining);
  console.log('[OfflineQueue] Flush complete - Synced:', flushed, 'Failed:', failed, 'Remaining:', remaining.length);
  
  return { flushed, failed, remaining: remaining.length };
}

/**
 * Clear all offline requests
 */
export function clearOfflineQueue() {
  writeQueue([]);
  console.log('[OfflineQueue] Queue cleared');
  return true;
}

/**
 * Setup offline sync with automatic retry
 */
export function setupOfflineSync({ requestAdapter, onSynced }) {
  console.log('[OfflineQueue] Setting up offline sync');

  const runSync = async () => {
    if (!navigator.onLine) {
      console.log('[OfflineQueue] Offline - skipping sync');
      return;
    }

    const result = await flushOfflineQueue({ requestAdapter });
    
    if (typeof onSynced === 'function') {
      onSynced(result);
    }

    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('offlineQueueSynced', { detail: result }));
  };

  // Listen for online event
  window.addEventListener('online', async () => {
    console.log('[OfflineQueue] Online event detected');
    await runSync();
  });

  // Listen for custom sync event from service worker
  navigator.serviceWorker?.addEventListener('message', async (event) => {
    if (event.data?.type === 'SYNC_OFFLINE_QUEUE') {
      console.log('[OfflineQueue] Received sync message from service worker');
      await runSync();
    }
  });

  // Run initial sync
  runSync();

  // Return cleanup function
  return () => {
    window.removeEventListener('online', runSync);
  };
}
