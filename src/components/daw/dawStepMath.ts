import { TrackGroup, Pattern } from '../../types';
import { instrumentsConfig, getVisualStrokeSymbol, isDarkText } from '../../data';
import { isVoiceStepProlongation } from '../../utils/musicTheory';
import { getBusNoteColor, getContrastColor } from '../../utils/colorHelpers';

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
  const override = track.patternOverrides?.[currentMeasure];
  const hasExplicitVariation = override !== undefined && override !== null;

  const masterTrack = isLinkedSlave
    ? tracks.find(t => (String(t.linkedToTrackId) === String(track.linkedToTrackId) && t.isLinkMaster) || String(t.id) === String(track.linkedToTrackId))
    : null;

  const parentBus = isLinkedSlave
    ? tracks.find(p => String(p.id) === String(track.linkedToTrackId) && p.isLinkFolder)
    : null;

  let activePattern: Pattern | null = null;
  if (hasExplicitVariation) {
    if (override === null) {
      activePattern = null;
    } else {
      activePattern = track.patterns?.find(p => p.id === override) ||
        parentBus?.patterns?.find(p => p.id === override) ||
        masterTrack?.patterns?.find(p => p.id === override) || null;
    }
  } else {
    const assigned = track.patterns?.find(p => p.measureAssignments?.[currentMeasure]);
    if (assigned) {
      activePattern = assigned;
    } else if (masterTrack) {
      const masterOverride = masterTrack.patternOverrides?.[currentMeasure];
      if (masterOverride !== undefined && masterOverride !== null) {
        activePattern = masterTrack.patterns?.find(p => p.id === masterOverride) || null;
      } else {
        activePattern = masterTrack.patterns?.find(p => p.measureAssignments?.[currentMeasure]) || masterTrack.patterns?.[0] || null;
      }
    } else if (parentBus) {
      activePattern = parentBus.patterns?.find(p => p.measureAssignments?.[currentMeasure]) || parentBus.patterns?.[0] || null;
    } else {
      activePattern = effectiveTrack.patterns?.find(p => p.measureAssignments?.[currentMeasure]) || effectiveTrack.patterns?.[0] || null;
    }
  }

  return { activePattern, masterActivePattern: activePattern, isGhostStep: false };
}

export function computeBeatGroups(stepsCount: number, defaultBeats: number, beatRes: number[]) {
  const effectiveBeats = stepsCount <= 8 ? Math.min(defaultBeats, 2) : stepsCount <= 12 ? Math.min(defaultBeats, 3) : defaultBeats;
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
