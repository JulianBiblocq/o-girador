import { TrackGroup } from '../../../types';
import { isSlaveTrack, resolveMasterTrack } from '../../../utils/trackMasterResolver';

export const NOMINAL_STEP_VOLUME = 70;
export const getDefaultStrokeDecay = (isVoice: boolean): number => (isVoice ? 10 : 100);
export const getMinStrokeDecay = (isVoice: boolean): number => (isVoice ? 1 : 10);

export function isLegacyUnitScaleArray(arr: readonly unknown[] | undefined, isPercussionDecay = false): boolean {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  let hasFinite = false;
  let hasPositive = false;
  let hasFraction = false;
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const vals = Array.isArray(item) ? item : [item];
    for (let j = 0; j < vals.length; j++) {
      const n = vals[j];
      if (typeof n !== 'number' || !Number.isFinite(n)) continue;
      hasFinite = true;
      if (n < 0 || n > 1) return false;
      if (n > 0) hasPositive = true;
      if (n > 0 && n < 1) hasFraction = true;
    }
  }
  return hasFinite && (hasFraction || (isPercussionDecay && hasPositive));
}

export function normalizeSculptScalar(
  raw: unknown, fallback: number, minVal: number, unitScale = false
): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return fallback;
  let scaled = raw;
  if (unitScale) scaled = raw * 100;
  else if (raw > 0 && raw < 1) scaled = raw * 100;
  return Math.max(minVal, Math.min(100, Math.round(scaled)));
}

export function matchesInspectorStroke(rawStepSym: unknown, targetStroke: string, instId?: string): boolean {
  if (!rawStepSym || rawStepSym === 0 || rawStepSym === '0' || rawStepSym === '-') return false;
  let sym = String(rawStepSym).trim();
  if (!sym || sym === '0' || sym === '-') return false;
  if (sym === targetStroke) return true;

  const id = (instId || '').toLowerCase();
  if (['marcante', 'meiao', 'repique', 'alfaia'].includes(id) && sym === 'a') sym = 'A';
  if (['marcante', 'meiao', 'repique', 'alfaia', 'caixa', 'tarol'].includes(id)) {
    if (sym === 't' || sym === 'T') sym = 'B';
    else if (sym === 'C') sym = 'c';
  } else if (id === 'agbe' || id === 'gongue') {
    if (sym === 't') sym = 'B';
    else if (id === 'gongue' && sym === 'x') sym = 'X';
  } else if (id === 'apito') {
    if (sym === 'W') sym = 'L';
    else if (sym === 'w' || sym === 'c') sym = 'C';
  }
  return sym === targetStroke;
}

export function resolveInspectorTrackScope(trackId: number | string, tracks: readonly TrackGroup[]): {
  readTracks: TrackGroup[];
  writeTrackIds: Set<string>;
} {
  const idStr = String(trackId);
  const source = tracks.find((t) => String(t.id) === idStr);
  if (!source) return { readTracks: [], writeTrackIds: new Set([idStr]) };

  const allTracks = tracks as TrackGroup[];
  if (source.isLinkFolder) {
    const members = allTracks.filter(
      (t) => !t.isBusFolder && !t.isLinkFolder && (String(t.linkedToTrackId) === idStr || String(t.busId) === idStr)
    );
    return {
      readTracks: members.length > 0 ? members : [source],
      writeTrackIds: new Set([idStr, ...members.map((t) => String(t.id))]),
    };
  }

  const parentFolder = allTracks.find(
    (t) => t.isLinkFolder && (String(t.id) === String(source.linkedToTrackId) || String(t.id) === String(source.busId))
  );
  const isEffectiveMaster = !source.isBusFolder && !source.isLinkFolder && (
    source.isLinkMaster === true || Boolean(parentFolder && resolveMasterTrack(source.id, allTracks)?.id === source.id)
  );

  if (isEffectiveMaster) {
    const slaves = allTracks.filter(
      (t) => t.id !== source.id && isSlaveTrack(t, allTracks) && resolveMasterTrack(t.id, allTracks)?.id === source.id
    );
    const writeIds = new Set<string>([idStr, ...slaves.map((t) => String(t.id))]);
    if (parentFolder) writeIds.add(String(parentFolder.id));
    return { readTracks: [source, ...slaves], writeTrackIds: writeIds };
  }

  return { readTracks: [source], writeTrackIds: new Set([idStr]) };
}
