/**
 * rodaTrackFrameCache.ts — Cache O(1) par piste/mesure pour `drawPercussionTrack` (< 95 lignes).
 * Évite de réallouer et trier en O(N²) `resolveTrackStepsForMeasure` (`M`, `M+1`, `M-1`) et
 * `buildCandidateAnglesForSweep` à 60–120 FPS sur les 6 à 9 anneaux de la Roda hors mode Éco.
 */
import { TrackGroup } from '../../types';
import { useTransportStore } from '../../stores/useTransportStore';
import { buildCandidateAnglesForSweep, resolveTrackStepsForMeasure } from './rodaSweepMath';

type ResolvedMeasureSlot = ReturnType<typeof resolveTrackStepsForMeasure>;

interface MeasureSlotEntry {
  trackRef: TrackGroup;
  rawTracksRef: TrackGroup[];
  measureIdx: number;
  soloPlayId: number | null;
  soloVarId: string | null;
  snapshotStepsRef: any;
  sig: string;
  result: ResolvedMeasureSlot;
}

interface CandidateAnglesCacheEntry {
  currRef: readonly number[];
  nextRef: readonly number[];
  prevRef: readonly number[];
  isPlaying: boolean;
  sweepMode: string;
  canNext: boolean;
  canPrev: boolean;
  candidates: { p: number; angle: number }[];
}

interface TrackRodaCache {
  slots: [MeasureSlotEntry | null, MeasureSlotEntry | null];
  candidates: CandidateAnglesCacheEntry | null;
}

const cacheByTrackId = new Map<number, TrackRodaCache>();

function getOrCreateTrackCache(trackId: number): TrackRodaCache {
  let entry = cacheByTrackId.get(trackId);
  if (!entry) {
    entry = { slots: [null, null], candidates: null };
    if (cacheByTrackId.size > 48) cacheByTrackId.clear();
    cacheByTrackId.set(trackId, entry);
  }
  return entry;
}

export function resolveCachedTrackStepsForMeasure(
  slotIdx: 0 | 1,
  track: TrackGroup,
  rawTracks: TrackGroup[],
  measureIdx: number,
  soloPatternPlayId: number | null,
  stepsSnapshot: Record<number, any> | null | undefined,
  measureTimeSigs: Record<number, string> | undefined,
  defaultTimeSig: string | undefined
): ResolvedMeasureSlot {
  const tc = getOrCreateTrackCache(track.id);
  const prev = tc.slots[slotIdx];
  const sig = measureTimeSigs?.[measureIdx] || defaultTimeSig || '4/4';
  const soloVarId = soloPatternPlayId !== null ? useTransportStore.getState().soloPatternVariationId : null;
  const snapStepsRef = stepsSnapshot ? stepsSnapshot[track.id] : null;

  if (
    prev &&
    prev.trackRef === track &&
    prev.rawTracksRef === rawTracks &&
    prev.measureIdx === measureIdx &&
    prev.soloPlayId === soloPatternPlayId &&
    prev.soloVarId === soloVarId &&
    prev.snapshotStepsRef === snapStepsRef &&
    prev.sig === sig
  ) {
    return prev.result;
  }

  const result = resolveTrackStepsForMeasure(track, rawTracks, measureIdx, soloPatternPlayId, stepsSnapshot, measureTimeSigs, defaultTimeSig);
  tc.slots[slotIdx] = {
    trackRef: track, rawTracksRef: rawTracks, measureIdx, soloPlayId: soloPatternPlayId,
    soloVarId, snapshotStepsRef: snapStepsRef, sig, result,
  };
  return result;
}

export function getCachedCandidateAnglesForSweep(
  trackId: number,
  currAngles: number[],
  nextAngles: number[],
  prevAngles: number[],
  isPlaying: boolean,
  rodaSweepMode: 'sweep6h' | 'fullMeasure' | undefined,
  canSweepNext: boolean,
  canSweepPrev: boolean
): { p: number; angle: number }[] {
  const tc = getOrCreateTrackCache(trackId);
  const c = tc.candidates;
  const sweepKey = rodaSweepMode || 'sweep6h';
  const sameArrayContents = (a: readonly number[], b: readonly number[]) =>
    a === b || (a.length === b.length && (a.length === 0 || (a[0] === b[0] && a[a.length - 1] === b[b.length - 1])));

  if (
    c &&
    c.isPlaying === isPlaying &&
    c.sweepMode === sweepKey &&
    c.canNext === canSweepNext &&
    c.canPrev === canSweepPrev &&
    sameArrayContents(c.currRef, currAngles) &&
    (!canSweepNext || sameArrayContents(c.nextRef, nextAngles)) &&
    (!canSweepPrev || sameArrayContents(c.prevRef, prevAngles))
  ) {
    return c.candidates;
  }

  const candidates = buildCandidateAnglesForSweep(currAngles, nextAngles, prevAngles, isPlaying, rodaSweepMode, canSweepNext, canSweepPrev);
  tc.candidates = {
    currRef: currAngles, nextRef: nextAngles, prevRef: prevAngles,
    isPlaying, sweepMode: sweepKey, canNext: canSweepNext, canPrev: canSweepPrev, candidates,
  };
  return candidates;
}
