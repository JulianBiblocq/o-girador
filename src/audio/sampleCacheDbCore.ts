/**
 * O Girador - Gestionnaire Singleton IndexedDB & Purge du Cache PCM (`OGirador_AudioCache`) (< 105 lignes)
 */

export const SAMPLE_CACHE_VERSION = 15;
export const SAMPLE_CACHE_DB_NAME = 'OGirador_AudioCache';
export const SAMPLE_CACHE_DB_VERSION = 1;
export const SAMPLE_CACHE_STORE_NAME = 'audio_sample_cache';
export const SW_CACHE_VER_STORAGE_KEY = 'ogirador_audio_sample_cache_v';
export const SW_AUDIO_CACHE_NAME = 'audio-samples-cache';

let initCachePromise: Promise<IDBDatabase | null> | null = null;
let activeDbInstance: IDBDatabase | null = null;

async function purgeStaleSwCacheOnce(): Promise<void> {
  try {
    const g = globalThis as any;
    const storage: Storage | undefined = g.window?.localStorage ?? g.localStorage;
    const cachesApi: CacheStorage | undefined = g.window?.caches ?? g.caches;
    const verStr = String(SAMPLE_CACHE_VERSION);
    if (!storage || storage.getItem(SW_CACHE_VER_STORAGE_KEY) === verStr) return;
    storage.setItem(SW_CACHE_VER_STORAGE_KEY, verStr);
    if (cachesApi && typeof cachesApi.delete === 'function') {
      await Promise.race([
        cachesApi.delete(SW_AUDIO_CACHE_NAME).catch(() => false),
        new Promise((r) => setTimeout(r, 400)),
      ]);
    }
  } catch (_) {}
}

function scheduleStaleIdbKeysPurge(db: IDBDatabase): void {
  try {
    const validPrefix = `v${SAMPLE_CACHE_VERSION}_`;
    const store = db.transaction(SAMPLE_CACHE_STORE_NAME, 'readwrite').objectStore(SAMPLE_CACHE_STORE_NAME);
    const req = typeof store.openKeyCursor === 'function' ? store.openKeyCursor() : store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return;
      if (!String(cursor.key || '').startsWith(validPrefix)) {
        try { store.delete(cursor.primaryKey ?? cursor.key); } catch (_) {}
      }
      cursor.continue();
    };
  } catch (_) {}
}

export function openAudioSampleCacheDb(): Promise<IDBDatabase | null> {
  const g = globalThis as any;
  const idb: IDBFactory | undefined = g.window?.indexedDB ?? g.indexedDB;
  if (!idb) return Promise.resolve(null);
  if (!initCachePromise) {
    initCachePromise = (async () => {
      await purgeStaleSwCacheOnce();
      return new Promise<IDBDatabase | null>((resolve) => {
        try {
          const request = idb.open(SAMPLE_CACHE_DB_NAME, SAMPLE_CACHE_DB_VERSION);
          request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(SAMPLE_CACHE_STORE_NAME)) {
              request.result.createObjectStore(SAMPLE_CACHE_STORE_NAME, { keyPath: 'id' });
            }
          };
          request.onsuccess = () => {
            activeDbInstance = request.result;
            scheduleStaleIdbKeysPurge(request.result);
            resolve(request.result);
          };
          request.onerror = () => resolve(null);
        } catch (_) {
          resolve(null);
        }
      });
    })();
  }
  return initCachePromise;
}

export function resetAudioSampleCacheSingletonForTests(): void {
  initCachePromise = null;
  activeDbInstance = null;
}

export async function clearAudioSampleCache(): Promise<void> {
  try {
    const g = globalThis as any;
    const storage: Storage | undefined = g.window?.localStorage ?? g.localStorage;
    try { storage?.removeItem?.(SW_CACHE_VER_STORAGE_KEY); } catch (_) {}
    const db = activeDbInstance ?? (await openAudioSampleCacheDb());
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(SAMPLE_CACHE_STORE_NAME, 'readwrite');
          const store = tx.objectStore(SAMPLE_CACHE_STORE_NAME);
          if (typeof store.clear === 'function') store.clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch (_) { resolve(); }
      });
    }
  } catch (_) {}
}
