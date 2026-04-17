const OFFLINE_QUEUE_KEY = 'sibms_offline_queue_v1';

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
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
}

export function enqueueOfflineRequest(item) {
  const queue = readQueue();
  queue.push({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    createdAt: new Date().toISOString(),
    ...item,
  });
  writeQueue(queue);
  return queue.length;
}

export function getOfflineQueueSize() {
  return readQueue().length;
}

export async function flushOfflineQueue({ requestAdapter }) {
  if (!navigator.onLine) {
    return { flushed: 0, failed: 0, remaining: readQueue().length };
  }

  const pending = readQueue();
  if (!pending.length) {
    return { flushed: 0, failed: 0, remaining: 0 };
  }

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
    } catch {
      failed += 1;
      remaining.push(item);
    }
  }

  writeQueue(remaining);
  return { flushed, failed, remaining: remaining.length };
}

export function setupOfflineSync({ requestAdapter, onSynced }) {
  const runSync = async () => {
    const result = await flushOfflineQueue({ requestAdapter });
    if (typeof onSynced === 'function') {
      onSynced(result);
    }
  };

  window.addEventListener('online', runSync);
  runSync();

  return () => {
    window.removeEventListener('online', runSync);
  };
}
