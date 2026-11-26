/**
 * rodaSpritePrewarmer.ts — Pré-chauffage des tampons Xilogravura & du Balai 6h (< 125 lignes).
 * - Prioritaire synchrone `[M_start, M_start + 1]` avant `Play` (< 3 ms).
 * - Arrière-plan par paquets `requestIdleCallback` au chargement de preset et changement de `visibleTracks`.
 */
import { getVisualStrokeSymbol, instrumentsConfig, isDarkText } from '../../data';
import { isToadaBus } from '../../stores/useSequencerStore';
import { Pattern, TrackGroup } from '../../types';
import { computeRodaStepAngles, resolveActiveBeatResolutions } from '../../utils/rodaTimeSigGeometry';
import { resolveActivePattern } from '../../workers/compiler/patternResolver';
import { getTrackRadius } from './circleGeometry';
import { formatStrokeSymbol } from './percussionSatelliteHelpers';
import { resolveStepPastilleData } from './resolveStepPastilleData';
import { getOrCreateRodaSweepSprite } from './rodaSweepSpriteCache';
import { isRodaDrawableTrack } from './sortTracksByRodaOrder';
import { getOrCreateXiloStampSprite } from './xiloStampSpriteCache';

interface StampWarmJob {
  fill: string; txtColor: string; text: string; radius: number; scale: number; isAccent: boolean;
}

let pendingIdleHandle: number | null = null;
let pendingTimeoutHandle: ReturnType<typeof setTimeout> | null = null;

export function cancelPendingRodaSpritePrewarm(): void {
  if (pendingIdleHandle !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    try { (window as any).cancelIdleCallback(pendingIdleHandle); } catch (_) {}
  }
  if (pendingTimeoutHandle !== null) clearTimeout(pendingTimeoutHandle);
  pendingIdleHandle = null; pendingTimeoutHandle = null;
}

function enqueueStepJobs(
  rawState: any, inst: any, track: TrackGroup, allTracks: TrackGroup[], isLeftHanded: boolean,
  dynamicScale: number, totalRings: number, tRad: number, stepCount: number,
  hasVar: boolean, seen: Set<string>, out: StampWarmJob[]
): void {
  const isRas = Array.isArray(rawState) && rawState.length === 2;
  const master = isRas ? rawState[0] : rawState;
  const p = resolveStepPastilleData(master, [], inst, track, allTracks, instrumentsConfig, isLeftHanded, dynamicScale, totalRings, tRad, stepCount);
  if (p.hasEvent) {
    for (const acc of hasVar ? [false, true] : [false]) {
      const k = `${p.leftFillColor}|${p.leftTxtColor}|${p.leftText}|${p.radiusSize.toFixed(1)}|${dynamicScale.toFixed(2)}|${acc ? 1 : 0}`;
      if (!seen.has(k)) { seen.add(k); out.push({ fill: p.leftFillColor, txtColor: p.leftTxtColor, text: p.leftText, radius: p.radiusSize, scale: dynamicScale, isAccent: acc }); }
    }
  }
  if (isRas && rawState[1] && rawState[1] !== '0' && rawState[1] !== 0) {
    const vis = getVisualStrokeSymbol(rawState[1], isLeftHanded, inst.id);
    const prim = String(Array.isArray(vis) ? vis[0] : vis), isAcc = prim === prim.toUpperCase();
    const fill = (inst.colors && inst.colors[prim]) ? inst.colors[prim] : (inst.color || '#fff');
    const txtColor = isDarkText(inst.id, String(rawState[1])) ? '#1a1a1a' : '#f4ecd8';
    const text = formatStrokeSymbol(inst.id, prim), subR = 9 * dynamicScale;
    const kSub = `${fill}|${txtColor}|${text}|${subR.toFixed(1)}|${dynamicScale.toFixed(2)}|${isAcc ? 1 : 0}`;
    if (!seen.has(kSub)) { seen.add(kSub); out.push({ fill, txtColor, text, radius: subR, scale: dynamicScale, isAccent: isAcc }); }
  }
}

function collectStampJobs(
  visibleTracks: TrackGroup[], allTracks: TrackGroup[], isLeftHanded: boolean,
  defaultTimeSig: string, measureTimeSigs?: Record<number, string>, measureSubset?: number[]
): StampWarmJob[] {
  const rodaTracks = visibleTracks.filter(isRodaDrawableTrack), totalRings = rodaTracks.length;
  if (totalRings === 0) return [];
  const dynamicScale = totalRings <= 2 ? 1.95 : 1 + ((10 - Math.min(totalRings, 10)) * 0.08);
  const seen = new Set<string>(), jobs: StampWarmJob[] = [];

  rodaTracks.forEach((track, ringIdx) => {
    if (isToadaBus(track)) return;
    const inst = instrumentsConfig[track.instrumentIdx];
    if (!inst || inst.type === 'voice') return;
    const tRad = getTrackRadius(ringIdx, totalRings);
    const patterns: Pattern[] = measureSubset
      ? Array.from(new Set(measureSubset.map((m) => resolveActivePattern(track, allTracks, m, false, null) as Pattern | null).filter(Boolean) as Pattern[]))
      : (track.patterns || []);
    for (const pat of patterns) {
      const sig = (measureSubset && measureTimeSigs?.[measureSubset[0]]) || defaultTimeSig || '4/4';
      const stepCount = computeRodaStepAngles(sig, resolveActiveBeatResolutions(sig, pat)).length;
      const hasVar = Boolean(pat.variations && pat.variations.length > 0);
      for (const s of pat.activeSteps || []) if (s && s !== 0 && s !== '0') enqueueStepJobs(s, inst, track, allTracks, isLeftHanded, dynamicScale, totalRings, tRad, stepCount, hasVar, seen, jobs);
      for (const v of pat.variations || []) for (const s of v.steps || []) if (s && s !== 0 && s !== '0') enqueueStepJobs(s, inst, track, allTracks, isLeftHanded, dynamicScale, totalRings, tRad, stepCount, true, seen, jobs);
    }
  });
  return jobs;
}

export function prewarmRodaSpritesForMeasuresSync(
  visibleTracks: TrackGroup[], allTracks: TrackGroup[], measureIndices: number[],
  isLeftHanded: boolean, defaultTimeSig = '4/4', measureTimeSigs?: Record<number, string>
): void {
  if (typeof document === 'undefined') return;
  getOrCreateRodaSweepSprite(130, 512);
  const jobs = collectStampJobs(visibleTracks, allTracks, isLeftHanded, defaultTimeSig, measureTimeSigs, measureIndices);
  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    getOrCreateXiloStampSprite(j.fill, j.txtColor, j.text, j.radius, j.scale, j.isAccent);
  }
}

export function scheduleIdleRodaSpritePrewarm(
  visibleTracks: TrackGroup[], allTracks: TrackGroup[], isLeftHanded: boolean,
  defaultTimeSig = '4/4', measureTimeSigs?: Record<number, string>
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  cancelPendingRodaSpritePrewarm();
  const jobs = collectStampJobs(visibleTracks, allTracks, isLeftHanded, defaultTimeSig, measureTimeSigs);
  let cursor = 0;
  const runChunk = (deadline?: { timeRemaining: () => number }) => {
    pendingIdleHandle = null; pendingTimeoutHandle = null;
    getOrCreateRodaSweepSprite(130, 512);
    const t0 = performance.now();
    while (cursor < jobs.length) {
      const j = jobs[cursor++];
      getOrCreateXiloStampSprite(j.fill, j.txtColor, j.text, j.radius, j.scale, j.isAccent);
      if (deadline ? deadline.timeRemaining() < 2 : (performance.now() - t0 > 2.2)) break;
    }
    if (cursor < jobs.length) {
      if ('requestIdleCallback' in window) pendingIdleHandle = (window as any).requestIdleCallback(runChunk, { timeout: 400 });
      else pendingTimeoutHandle = setTimeout(() => runChunk(), 24);
    }
  };
  if ('requestIdleCallback' in window) pendingIdleHandle = (window as any).requestIdleCallback(runChunk, { timeout: 300 });
  else pendingTimeoutHandle = setTimeout(() => runChunk(), 16);
}
