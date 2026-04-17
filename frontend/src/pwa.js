import { setupOfflineSync } from './offlineQueue';
import { replayQueuedRequest } from './auth';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      // Ignore registration errors in environments where service workers are not available.
    });
  });
}

export function initializeOfflineSync() {
  return setupOfflineSync({
    requestAdapter: replayQueuedRequest,
  });
}
