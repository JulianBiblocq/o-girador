/**
 * O Girador - Cache PCM Brut IndexedDB Versionné & Signé (`OGirador_AudioCache`) (< 100 lignes)
 * - Clé primaire `v${SAMPLE_CACHE_VERSION}_${canonicalPath}_${sampleRate}` (repli `.m4a` -> `.ogg` unifié).
 * - Validation stricte d'empreinte (`sampleHash` + `pcmHash` + géométrie PCM) et purge unique non bloquante.
 */
import { fetchAndDecodeAudioSample, normalizeCanonicalSampleKey } from './engine/sampleFetchUtils';
import {
  clearAudioSampleCache,
  openAudioSampleCacheDb,
  resetAudioSampleCacheSingletonForTests,
  SAMPLE_CACHE_STORE_NAME,
  SAMPLE_CACHE_VERSION,
} from './sampleCacheDbCore';
import {
  clearSampleRevisionOverrides,
  computeExpectedSampleHash,
  computePcmContentHash,
  getSampleRevisionTag,
  isCachedPcmSampleValid,
  registerSampleManifestRevisions,
  setSampleRevisionOverride,
} from './sampleCacheFingerprint';

export {
  clearAudioSampleCache,
  clearSampleRevisionOverrides,
  computeExpectedSampleHash,
  getSampleRevisionTag,
  registerSampleManifestRevisions,
  resetAudioSampleCacheSingletonForTests,
  SAMPLE_CACHE_VERSION,
  setSampleRevisionOverride,
};

export interface CachedPcmSample {
  id: string;
  version: number;
  path: string;
  sampleHash: string;
  pcmHash?: string;
  sampleRate: number;
  numberOfChannels: number;
  length: number;
  duration: number;
  channels: Float32Array[];
  timestamp: number;
}

export function getSampleCacheKey(path: string, sampleRate: number): string {
  return `v${SAMPLE_CACHE_VERSION}_${normalizeCanonicalSampleKey(path)}_${sampleRate}`;
}

export async function getCachedPcmSample(path: string, sampleRate: number): Promise<CachedPcmSample | null> {
  try {
    const canonicalPath = normalizeCanonicalSampleKey(path);
    const db = await openAudioSampleCacheDb();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const req = db.transaction(SAMPLE_CACHE_STORE_NAME, 'readonly').objectStore(SAMPLE_CACHE_STORE_NAME).get(getSampleCacheKey(canonicalPath, sampleRate));
        req.onsuccess = () => resolve(isCachedPcmSampleValid(req.result, canonicalPath, sampleRate, SAMPLE_CACHE_VERSION) ? (req.result as CachedPcmSample) : null);
        req.onerror = () => resolve(null);
      } catch (_) { resolve(null); }
    });
  } catch (_) { return null; }
}

export async function saveCachedPcmSample(rawPath: string, audioBuffer: AudioBuffer): Promise<void> {
  try {
    const path = normalizeCanonicalSampleKey(rawPath);
    const db = await openAudioSampleCacheDb();
    if (!db) return;
    const channels: Float32Array[] = [];
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) channels.push(new Float32Array(audioBuffer.getChannelData(c)));
    const entry: CachedPcmSample = {
      id: getSampleCacheKey(path, audioBuffer.sampleRate),
      version: SAMPLE_CACHE_VERSION,
      path,
      sampleHash: computeExpectedSampleHash(path, SAMPLE_CACHE_VERSION),
      pcmHash: computePcmContentHash(channels, audioBuffer.sampleRate, audioBuffer.length),
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
      length: audioBuffer.length,
      duration: audioBuffer.duration,
      channels,
      timestamp: Date.now(),
    };
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(SAMPLE_CACHE_STORE_NAME, 'readwrite');
        tx.objectStore(SAMPLE_CACHE_STORE_NAME).put(entry);
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
  audioContext: AudioContext,
  rawPath: string,
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
