import { TimeSignature } from '../../types';
import { getMaxTicks, getMarkers } from '../../data';

const RANDOM_POOL_SIZE = 1000;
const randomPool = Array.from({ length: RANDOM_POOL_SIZE }, () => Math.random());
let randomPoolIdx = 0;

export function nextRandom(): number {
  const val = randomPool[randomPoolIdx];
  randomPoolIdx = (randomPoolIdx + 1) % RANDOM_POOL_SIZE;
  return val;
}

const markersCache = new Map<string, number[]>();
export function getCachedMarkers(timeSig: string, ticks: number): number[] {
  const key = `${timeSig}_${ticks}`;
  if (!markersCache.has(key)) {
    markersCache.set(key, getMarkers(timeSig as any, ticks));
  }
  return markersCache.get(key)!;
}

export function getMeasureStartTick(mIdx: number, measureTimeSigs: Record<number, string> | string[]): number {
  let ticks = 0;
  for (let i = 0; i < mIdx; i++) {
    const timeSig = (measureTimeSigs as any)[i] || '4/4';
    ticks += getMaxTicks(timeSig as TimeSignature);
  }
  return ticks;
}

export const percentToDb = (percent: number): number => {
  if (percent <= 0) return -Infinity;
  const normalized = percent / 100;
  return 40 * Math.log10(normalized);
};

export function normalizePanForTone(panOrPanVal: number | undefined | null): number {
  if (panOrPanVal === undefined || panOrPanVal === null || isNaN(panOrPanVal)) return 0;
  const val = Number(panOrPanVal);
  const normalized = Math.abs(val) > 1 ? val / 100 : val;
  return Math.max(-1, Math.min(1, normalized));
}

let globalInvalidateAudioParamsCache: (() => void) | null = null;

export function setGlobalInvalidateAudioParamsCache(fn: (() => void) | null) {
  globalInvalidateAudioParamsCache = fn;
}

export function invalidateAudioParamsCache(): void {
  if (globalInvalidateAudioParamsCache) {
    globalInvalidateAudioParamsCache();
  }
}

export const instrumentIds = ['caixa', 'tarol', 'marcante', 'meiao', 'repique', 'gongue', 'agbe', 'apito'];
