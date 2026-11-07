/**
 * O-Girador - IndexedDB Raw PCM Cache for Decoded Audio Samples
 * Versioned via SAMPLE_CACHE_VERSION (`v${SAMPLE_CACHE_VERSION}_${path}_${sampleRate}`)
 * with automatic purge of stale versions on startup (< 135 lignes).
 */

export interface CachedPcmSample {
  id: string;
  path: string;
  sampleRate: number;
  numberOfChannels: number;
  length: number;
  duration: number;
  channels: Float32Array[];
  timestamp: number;
}

export const SAMPLE_CACHE_VERSION = 2;
const DB_NAME = 'OGirador_AudioCache';
const DB_VERSION = 1;
const STORE_NAME = 'audio_sample_cache';

let dbPromise: Promise<IDBDatabase | null> | null = null;
let stalePurgeTriggered = false;

function purgeStaleCacheEntries(db: IDBDatabase): void {
  if (stalePurgeTriggered) return;
  stalePurgeTriggered = true;
  try {
    const prefix = `v${SAMPLE_CACHE_VERSION}_`;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return;
      if (!String(cursor.key || '').startsWith(prefix)) {
        try { cursor.delete(); } catch (_) {}
      }
      cursor.continue();
    };
  } catch (_) {}
}

function getDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        };
        request.onsuccess = () => {
          const db = request.result;
          purgeStaleCacheEntries(db);
          resolve(db);
        };
        request.onerror = () => resolve(null);
      } catch (_) { resolve(null); }
    });
  }
  return dbPromise;
}

export function getSampleCacheKey(path: string, sampleRate: number): string {
  return `v${SAMPLE_CACHE_VERSION}_${path}_${sampleRate}`;
}

export async function getCachedPcmSample(path: string, sampleRate: number): Promise<CachedPcmSample | null> {
  try {
    const db = await getDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(getSampleCacheKey(path, sampleRate));
        req.onsuccess = () => {
          if (req.result && req.result.channels && req.result.sampleRate === sampleRate) resolve(req.result as CachedPcmSample);
          else resolve(null);
        };
        req.onerror = () => resolve(null);
      } catch (_) { resolve(null); }
    });
  } catch (_) { return null; }
}

export async function saveCachedPcmSample(path: string, audioBuffer: AudioBuffer): Promise<void> {
  try {
    const db = await getDB();
    if (!db) return;
    const numberOfChannels = audioBuffer.numberOfChannels;
    const channels: Float32Array[] = [];
    for (let c = 0; c < numberOfChannels; c++) channels.push(new Float32Array(audioBuffer.getChannelData(c)));
    const entry: CachedPcmSample = {
      id: getSampleCacheKey(path, audioBuffer.sampleRate),
      path, sampleRate: audioBuffer.sampleRate, numberOfChannels,
      length: audioBuffer.length, duration: audioBuffer.duration, channels, timestamp: Date.now()
    };
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(entry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (_) { resolve(); }
    });
  } catch (_) {}
}

export function reconstructAudioBuffer(audioContext: AudioContext, cached: CachedPcmSample): AudioBuffer {
  const buffer = audioContext.createBuffer(cached.numberOfChannels, cached.length, cached.sampleRate);
  for (let c = 0; c < cached.numberOfChannels; c++) buffer.copyToChannel(cached.channels[c] as any, c);
  return buffer;
}
