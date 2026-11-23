/**
 * vocalDspLruStore.ts — Gouvernance RAM (LRU) stricte des variantes vocales pré-calculées (`__dsp_${bpm}_${semitones}`) (< 105 lignes).
 * - Plafonne uniquement les buffers dérivés `__dsp_*` sans jamais toucher aux buffers maîtres `${trackId}_${patternId}`.
 * - Promotion O(1) à chaque lecture/écriture et éviction automatique des variantes les plus anciennes (ex. SpeedTrainer).
 */
export interface VocalPatternDspCacheEntry {
  cacheKey: string; audioBuffer: AudioBuffer; alpha: number; recordedBpm: number; liveBpm: number;
  transpositionSemitones: number; deltaSemitones: number; scaledT1OffsetSec: number; scaledTrimStartSec: number; scaledTrimEndSec: number;
}

export const DEFAULT_MAX_VOCAL_DSP_CACHE_ENTRIES = 24;

let maxVocalDspEntries = DEFAULT_MAX_VOCAL_DSP_CACHE_ENTRIES;
const dspBufferCache = new Map<string, VocalPatternDspCacheEntry>();

export function buildVocalDspCacheKey(
  patternIdOrComposite: string | number,
  currentBpm: number,
  vocalTransposeSteps: number,
  trackId?: string | number
): string {
  const baseKey =
    trackId !== undefined && trackId !== null && !String(patternIdOrComposite).includes('_')
      ? `${trackId}_${patternIdOrComposite}`
      : String(patternIdOrComposite);
  return `${baseKey}__dsp_${Math.round(Number(currentBpm || 88))}_${Math.round(Number(vocalTransposeSteps ?? 0))}`;
}

export function getLruDspEntry(cacheKey: string): VocalPatternDspCacheEntry | undefined {
  const existing = dspBufferCache.get(cacheKey);
  if (!existing) return undefined;
  dspBufferCache.delete(cacheKey);
  dspBufferCache.set(cacheKey, existing);
  return existing;
}

export function getCachedVocalPatternDspEntry(
  patternIdOrComposite: string | number,
  currentBpm: number,
  vocalTransposeSteps: number,
  trackId?: string | number
): VocalPatternDspCacheEntry | undefined {
  return (
    getLruDspEntry(buildVocalDspCacheKey(patternIdOrComposite, currentBpm, vocalTransposeSteps, trackId)) ??
    getLruDspEntry(buildVocalDspCacheKey(patternIdOrComposite, currentBpm, vocalTransposeSteps))
  );
}

export function setLruDspEntry(cacheKey: string, entry: VocalPatternDspCacheEntry): void {
  if (dspBufferCache.has(cacheKey)) {
    dspBufferCache.delete(cacheKey);
  }
  dspBufferCache.set(cacheKey, entry);
  while (dspBufferCache.size > maxVocalDspEntries) {
    const oldestKey = dspBufferCache.keys().next().value;
    if (oldestKey === undefined) break;
    dspBufferCache.delete(oldestKey);
  }
}

export function evictVocalDspVariantsByPrefix(baseKeyOrPatternId: string | number): number {
  const token = String(baseKeyOrPatternId).trim();
  if (!token) return 0;
  const directPrefix = `${token}__dsp_`;
  const suffixPrefix = `_${token}__dsp_`;
  let removed = 0;
  for (const key of Array.from(dspBufferCache.keys())) {
    if (key.startsWith(directPrefix) || key.includes(suffixPrefix)) {
      dspBufferCache.delete(key);
      removed++;
    }
  }
  return removed;
}

export function clearLruDspCache(): void {
  dspBufferCache.clear();
}

export function getVocalDspCacheSize(): number {
  return dspBufferCache.size;
}

export function getVocalDspCacheKeys(): string[] {
  return Array.from(dspBufferCache.keys());
}

export function setMaxVocalDspCacheEntriesForTests(limit: number = DEFAULT_MAX_VOCAL_DSP_CACHE_ENTRIES): void {
  maxVocalDspEntries = Math.max(1, Math.floor(limit));
  while (dspBufferCache.size > maxVocalDspEntries) {
    const oldestKey = dspBufferCache.keys().next().value;
    if (oldestKey === undefined) break;
    dspBufferCache.delete(oldestKey);
  }
}
