import { TrackGroup, Pattern } from '../types';
import { isSlaveTrack, resolveMasterTrack } from './trackMasterResolver';

export interface SlaveFocusContext {
  isFocusActive?: boolean;
  focusTrackId?: number | null;
  referenceTrackId?: number | null;
  activeAoVivoTrackId?: number | null;
  editingTrackId?: number | null;
  mobileViewMode?: string;
}

const normalizeSingleStepVal = (val: unknown): string => {
  if (val === 0 || val === '0' || val === '' || val === null || val === undefined || val === '-') {
    return '';
  }
  return String(val).trim();
};

export function isStepValueActive(val: unknown): boolean {
  if (Array.isArray(val)) {
    return val.some((sub) => normalizeSingleStepVal(sub) !== '');
  }
  return normalizeSingleStepVal(val) !== '';
}

export function areStepValuesEqual(valA: unknown, valB: unknown): boolean {
  const activeA = isStepValueActive(valA);
  const activeB = isStepValueActive(valB);
  if (!activeA && !activeB) return true;
  if (activeA !== activeB) return false;

  if (Array.isArray(valA) || Array.isArray(valB)) {
    const arrA = Array.isArray(valA) ? valA : [valA, ''];
    const arrB = Array.isArray(valB) ? valB : [valB, ''];
    return (
      normalizeSingleStepVal(arrA[0]) === normalizeSingleStepVal(arrB[0]) &&
      normalizeSingleStepVal(arrA[1]) === normalizeSingleStepVal(arrB[1])
    );
  }

  return normalizeSingleStepVal(valA) === normalizeSingleStepVal(valB);
}

export function isTrackExemptFromSlaveDimming(
  trackId: number,
  focusCtx?: SlaveFocusContext | null
): boolean {
  if (!focusCtx) return false;
  if (focusCtx.activeAoVivoTrackId === trackId) return true;
  if (focusCtx.editingTrackId === trackId) return true;
  const isFocusMode = Boolean(focusCtx.isFocusActive || focusCtx.mobileViewMode === 'percussion');
  if (isFocusMode && (focusCtx.focusTrackId === trackId || focusCtx.referenceTrackId === trackId)) {
    return true;
  }
  return false;
}

export function resolveMasterStepValueAt(
  slaveTrack: TrackGroup,
  allTracks: TrackGroup[],
  measureIdx: number,
  stepIdx: number,
  activeVariationsMap?: Record<number, (string | number | [string, string])[]> | null
): unknown {
  const masterTrack = resolveMasterTrack(slaveTrack.id, allTracks);
  if (!masterTrack || masterTrack.id === slaveTrack.id) return 0;

  if (activeVariationsMap && activeVariationsMap[masterTrack.id]) {
    return activeVariationsMap[masterTrack.id][stepIdx] ?? 0;
  }

  const override = masterTrack.patternOverrides?.[measureIdx];
  let masterPtn: Pattern | undefined;
  if (override !== undefined && override !== null) {
    masterPtn = masterTrack.patterns?.find((p) => p.id === override);
  }
  if (!masterPtn) {
    masterPtn =
      masterTrack.patterns?.find((p) => p.measureAssignments?.[measureIdx]) ||
      masterTrack.patterns?.[0];
  }
  return masterPtn?.activeSteps?.[stepIdx] ?? 0;
}

export function resolveSlaveStepOpacity(params: {
  track: TrackGroup;
  allTracks: TrackGroup[];
  measureIdx: number;
  stepIdx: number;
  ownStepVal: unknown;
  masterStepVal?: unknown;
  focusCtx?: SlaveFocusContext | null;
  activeVariationsMap?: Record<number, (string | number | [string, string])[]> | null;
}): number {
  const { track, allTracks, measureIdx, stepIdx, ownStepVal, masterStepVal, focusCtx, activeVariationsMap } = params;
  if (!isStepValueActive(ownStepVal)) return 1.0;
  if (!isSlaveTrack(track, allTracks)) return 1.0;
  if (isTrackExemptFromSlaveDimming(track.id, focusCtx)) return 1.0;

  const resolvedMasterVal =
    masterStepVal !== undefined
      ? masterStepVal
      : resolveMasterStepValueAt(track, allTracks, measureIdx, stepIdx, activeVariationsMap);

  return areStepValuesEqual(ownStepVal, resolvedMasterVal) ? 0.45 : 1.0;
}

