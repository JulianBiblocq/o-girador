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

  const parentBus = isLinkedSlave
    ? tracks.find(p => String(p.id) === String(track.linkedToTrackId) && p.isLinkFolder)
    : null;

  let activePattern: Pattern | null = null;
  if (isLinkedSlave && parentBus) {
    if (override === null) activePattern = null;
    else if (override !== undefined) activePattern = parentBus.patterns.find(p => p.id === override) || null;
    else activePattern = parentBus.patterns.find(p => p.measureAssignments?.[currentMeasure]) || parentBus.patterns[0] || null;
  } else {
    if (override === null) activePattern = null;
    else if (override !== undefined) activePattern = effectiveTrack.patterns?.find(p => p.id === override) || null;
    else activePattern = effectiveTrack.patterns?.find(p => p.measureAssignments?.[currentMeasure]) || effectiveTrack.patterns?.[0] || null;
  }

  const isGhostStep = isLinkedSlave && !hasExplicitVariation;
  const masterTrack = isGhostStep
    ? tracks.find(t => String(t.linkedToTrackId) === String(track.linkedToTrackId) && t.isLinkMaster)
    : null;
  const masterActivePattern = masterTrack
    ? (masterTrack.patterns?.find(p => p.measureAssignments?.[currentMeasure]) || masterTrack.patterns?.[0])
    : null;

  return { activePattern, masterActivePattern, isGhostStep };
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
