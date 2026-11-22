import { TrackGroup, Pattern } from '../../types';
import { useTransportStore } from '../../stores/useTransportStore';
import { resolveActivePattern } from '../../workers/compiler/patternResolver';
import { resolveMasterTrack } from '../../utils/trackMasterResolver';

export function resolveDawPattern({
  track,
  tracks,
  currentMeasure,
  effectiveTrack,
  isLinkedSlave,
}: {
  track: TrackGroup;
  tracks: TrackGroup[];
  currentMeasure: number;
  effectiveTrack: TrackGroup;
  isLinkedSlave: boolean;
}) {
  const soloPlayId = useTransportStore.getState().soloPatternPlayId;
  if (soloPlayId !== null && soloPlayId !== undefined) {
    const soloPat = resolveActivePattern(effectiveTrack, tracks, currentMeasure, true, soloPlayId) as Pattern | null;
    if (soloPat) return { activePattern: soloPat, masterActivePattern: soloPat, isGhostStep: false };
  }

  const masterTrack = isLinkedSlave ? resolveMasterTrack(track.id, tracks) ?? null : null;
  const parentBus = isLinkedSlave
    ? tracks.find((p) => String(p.id) === String(track.linkedToTrackId) && p.isLinkFolder)
    : null;

  let activePattern: Pattern | null = track.patterns?.find((p) => p.measureAssignments?.[currentMeasure]) || null;
  if (!activePattern) {
    if (masterTrack) {
      activePattern =
        masterTrack.patterns?.find((p) => p.measureAssignments?.[currentMeasure]) ||
        masterTrack.patterns?.[0] ||
        null;
    } else if (parentBus) {
      activePattern =
        parentBus.patterns?.find((p) => p.measureAssignments?.[currentMeasure]) ||
        parentBus.patterns?.[0] ||
        null;
    } else {
      activePattern =
        effectiveTrack.patterns?.find((p) => p.measureAssignments?.[currentMeasure]) ||
        effectiveTrack.patterns?.[0] ||
        null;
    }
  }

  return { activePattern, masterActivePattern: activePattern, isGhostStep: false };
}

export function computeBeatGroups(stepsCount: number, defaultBeats: number, beatRes: number[]) {
  const effectiveBeats =
    stepsCount <= 8 ? Math.min(defaultBeats, 2) : stepsCount <= 12 ? Math.min(defaultBeats, 3) : defaultBeats;
  const beatGroups: number[][] = [];
  let accumulated = 0;
  for (let b = 0; b < effectiveBeats; b++) {
    const res = beatRes[b] ?? 4;
    const group: number[] = [];
    for (let i = 0; i < res; i++) {
      if (accumulated + i < stepsCount) group.push(accumulated + i);
    }
    beatGroups.push(group);
    accumulated += res;
  }
  return { effectiveBeats, beatGroups };
}
