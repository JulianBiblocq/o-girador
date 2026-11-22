/**
 * O Girador - Cache PCM Brut IndexedDB Versionné & Signé (`OGirador_AudioCache`) (< 140 lignes)
 * - Clé primaire `v${SAMPLE_CACHE_VERSION}_${canonicalPath}_${sampleRate}` (repli `.m4a` -> `.ogg` unifié).
 * - Validation stricte d'empreinte (`sampleHash` + `pcmHash` + géométrie PCM) et purge unique non bloquante.
 */
import { fetchAndDecodeAudioSample, normalizeCanonicalSampleKey } from './engine/sampleFetchUtils';
import {
  clearSampleRevisionOverrides, computeExpectedSampleHash, computePcmContentHash,
  isCachedPcmSampleValid, registerSampleManifestRevisions, setSampleRevisionOverride,
} from './sampleCacheFingerprint';

export { clearSampleRevisionOverrides, computeExpectedSampleHash, registerSampleManifestRevisions, setSampleRevisionOverride };

export interface CachedPcmSample {
  id: string; version: number; path: string; sampleHash: string; pcmHash?: string;
  sampleRate: number; numberOfChannels: number; length: number; duration: number;
  channels: Float32Array[]; timestamp: number;
}

export const SAMPLE_CACHE_VERSION = 11;
const DB_NAME = 'OGirador_AudioCache';
const DB_VERSION = 1;
const STORE_NAME = 'audio_sample_cache';
const SW_CACHE_VER_STORAGE_KEY = 'ogirador_audio_sample_cache_v';
const SW_AUDIO_CACHE_NAME = 'audio-samples-cache';

let initCachePromise: Promise<IDBDatabase | null> | null = null;

async function purgeStaleSwCacheOnce(): Promise<void> {
  try {
    const g = globalThis as any;
    const storage: Storage | undefined = g.window?.localStorage ?? g.localStorage;
    const cachesApi: CacheStorage | undefined = g.window?.caches ?? g.caches;
    const verStr = String(SAMPLE_CACHE_VERSION);
    if (!storage || storage.getItem(SW_CACHE_VER_STORAGE_KEY) === verStr) return;
    storage.setItem(SW_CACHE_VER_STORAGE_KEY, verStr);
    if (cachesApi && typeof cachesApi.delete === 'function') {
      await Promise.race([cachesApi.delete(SW_AUDIO_CACHE_NAME).catch(() => false), new Promise((r) => setTimeout(r, 400))]);
    }
  } catch (_) {}
}

function scheduleStaleIdbKeysPurge(db: IDBDatabase): void {
  try {
    const validPrefix = `v${SAMPLE_CACHE_VERSION}_`;
    const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
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

function getDB(): Promise<IDBDatabase | null> {
  const g = globalThis as any;
  const idb: IDBFactory | undefined = g.window?.indexedDB ?? g.indexedDB;
  if (!idb) return Promise.resolve(null);
  if (!initCachePromise) {
    initCachePromise = (async () => {
      await purgeStaleSwCacheOnce();
      return new Promise<IDBDatabase | null>((resolve) => {
        try {
          const request = idb.open(DB_NAME, DB_VERSION);
          request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
          };
          request.onsuccess = () => { scheduleStaleIdbKeysPurge(request.result); resolve(request.result); };
          request.onerror = () => resolve(null);
        } catch (_) { resolve(null); }
      });
    })();
  }
  return initCachePromise;
}

export function resetAudioSampleCacheSingletonForTests(): void { initCachePromise = null; }
export function getSampleCacheKey(path: string, sampleRate: number): string {
  return `v${SAMPLE_CACHE_VERSION}_${normalizeCanonicalSampleKey(path)}_${sampleRate}`;
}

export async function getCachedPcmSample(path: string, sampleRate: number): Promise<CachedPcmSample | null> {
  try {
    const canonicalPath = normalizeCanonicalSampleKey(path);
    const db = await getDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(getSampleCacheKey(canonicalPath, sampleRate));
        req.onsuccess = () => resolve(isCachedPcmSampleValid(req.result, canonicalPath, sampleRate, SAMPLE_CACHE_VERSION) ? (req.result as CachedPcmSample) : null);
        req.onerror = () => resolve(null);
      } catch (_) { resolve(null); }
    });
  } catch (_) { return null; }
}

export async function saveCachedPcmSample(rawPath: string, audioBuffer: AudioBuffer): Promise<void> {
  try {
    const path = normalizeCanonicalSampleKey(rawPath);
    const db = await getDB();
    if (!db) return;
    const channels: Float32Array[] = [];
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) channels.push(new Float32Array(audioBuffer.getChannelData(c)));
    const entry: CachedPcmSample = {
      id: getSampleCacheKey(path, audioBuffer.sampleRate), version: SAMPLE_CACHE_VERSION, path,
      sampleHash: computeExpectedSampleHash(path, SAMPLE_CACHE_VERSION),
      pcmHash: computePcmContentHash(channels, audioBuffer.sampleRate, audioBuffer.length),
      sampleRate: audioBuffer.sampleRate, numberOfChannels: audioBuffer.numberOfChannels,
      length: audioBuffer.length, duration: audioBuffer.duration, channels, timestamp: Date.now(),
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

export async function getCachedSampleBuffer(
  audioContext: AudioContext, rawPath: string,
  fetchAndDecodeSampleBuffer: (ctx: BaseAudioContext, samplePath: string) => Promise<AudioBuffer | null> = fetchAndDecodeAudioSample
): Promise<AudioBuffer | null> {
  const canonicalPath = normalizeCanonicalSampleKey(rawPath);
  const cached = await getCachedPcmSample(canonicalPath, audioContext.sampleRate);
  if (cached) return reconstructAudioBuffer(audioContext, cached);
  const freshBuffer = await fetchAndDecodeSampleBuffer(audioContext, canonicalPath);
  if (!freshBuffer) return null;
  saveCachedPcmSample(canonicalPath, freshBuffer).catch(() => {});
  return freshBuffer;
}
