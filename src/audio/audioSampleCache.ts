/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * O-Girador - IndexedDB Raw PCM Cache for Decoded Audio Samples
 * 
 * Stores raw Float32Array PCM channel buffers in IndexedDB to completely
 * bypass the CPU overhead of decodeAudioData() on startup.
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

const DB_NAME = 'OGirador_AudioCache';
const DB_VERSION = 1;
const STORE_NAME = 'audio_sample_cache';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function getDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = (err) => {
          console.warn('[AudioCache] Failed to open IndexedDB:', err);
          resolve(null);
        };
      } catch (e) {
        console.warn('[AudioCache] IndexedDB initialization error:', e);
        resolve(null);
      }
    });
  }
  return dbPromise;
}

function getCacheKey(path: string, sampleRate: number): string {
  return `${path}_${sampleRate}`;
}

export async function getCachedPcmSample(path: string, sampleRate: number): Promise<CachedPcmSample | null> {
  try {
    const db = await getDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(getCacheKey(path, sampleRate));
        req.onsuccess = () => {
          if (req.result && req.result.channels && req.result.sampleRate === sampleRate) {
            resolve(req.result as CachedPcmSample);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch (_) {
        resolve(null);
      }
    });
  } catch (_) {
    return null;
  }
}

export async function saveCachedPcmSample(path: string, audioBuffer: AudioBuffer): Promise<void> {
  try {
    const db = await getDB();
    if (!db) return;

    const numberOfChannels = audioBuffer.numberOfChannels;
    const channels: Float32Array[] = [];
    for (let c = 0; c < numberOfChannels; c++) {
      channels.push(new Float32Array(audioBuffer.getChannelData(c)));
    }

    const entry: CachedPcmSample = {
      id: getCacheKey(path, audioBuffer.sampleRate),
      path,
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels,
      length: audioBuffer.length,
      duration: audioBuffer.duration,
      channels,
      timestamp: Date.now()
    };

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(entry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (_) {
        resolve();
      }
    });
  } catch (_) {
    // Non-critical background cache write
  }
}

export function reconstructAudioBuffer(audioContext: AudioContext, cached: CachedPcmSample): AudioBuffer {
  const buffer = audioContext.createBuffer(
    cached.numberOfChannels,
    cached.length,
    cached.sampleRate
  );
  for (let c = 0; c < cached.numberOfChannels; c++) {
    buffer.copyToChannel(cached.channels[c] as any, c);
  }
  return buffer;
}
