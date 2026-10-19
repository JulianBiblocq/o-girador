import { SongSection, SongMarker, TrackGroup, TimeSignature } from '../../types';

const expandArray = <T>(arr: T[] | undefined, fill: T, targetTotal: number): T[] => {
  const n = [...(arr || [])];
  while (n.length < targetTotal) n.push(fill);
  return n;
};

const buildExpandedMeasuresState = (state: Record<string, any>, targetTotal: number, nextSections: SongSection[]): Record<string, any> => ({
  songSections: nextSections,
  totalMeasures: targetTotal,
  measureTimeSigs: expandArray(state.measureTimeSigs, state.timeSig, targetTotal),
  measureBpms: expandArray(state.measureBpms, state.bpm, targetTotal),
  measureBpmTransitions: expandArray(state.measureBpmTransitions, 'immediate', targetTotal),
  measureVols: expandArray(state.measureVols, 75, targetTotal),
  measureVolTransitions: expandArray(state.measureVolTransitions, 'immediate', targetTotal),
  measureSignals: expandArray(state.measureSignals, null, targetTotal),
  tracks: state.tracks.map((t: TrackGroup) => ({
    ...t,
    measureVols: t.measureVols ? expandArray(t.measureVols, t.volumeVal ?? 75, targetTotal) : undefined,
    measureVolTransitions: t.measureVolTransitions ? expandArray(t.measureVolTransitions, 'immediate' as const, targetTotal) : undefined,
    measurePans: t.measurePans ? expandArray(t.measurePans, t.panVal ?? t.pan ?? 0, targetTotal) : undefined,
    measurePanTransitions: t.measurePanTransitions ? expandArray(t.measurePanTransitions, 'immediate' as const, targetTotal) : undefined,
    measureReverbSends: t.measureReverbSends ? expandArray(t.measureReverbSends, t.fxSends?.reverb ?? t.reverbVal ?? 0, targetTotal) : undefined,
    measureReverbTransitions: t.measureReverbTransitions ? expandArray(t.measureReverbTransitions, 'immediate' as const, targetTotal) : undefined,
    patterns: t.patterns.map(p => ({
      ...p,
      measureAllowVariations: p.measureAllowVariations ? expandArray(p.measureAllowVariations, true, targetTotal) : undefined,
    }))
  }))
});

export const createSongSectionState = (
  state: { songSections: SongSection[]; totalMeasures: number; [key: string]: any },
  name: string,
  start: number,
  end: number,
  color?: string,
  repeatCount?: number,
  level?: number
): Record<string, any> => {
  const newSection: SongSection = {
    id: Date.now().toString(),
    name,
    startMeasure: start,
    endMeasure: end,
    color: color || '#27ae60',
    repeatCount: repeatCount || 1,
    level: level || 0,
  };
  const next = [...state.songSections, newSection].sort((a, b) => a.startMeasure - b.startMeasure);
  const targetTotal = Math.max(state.totalMeasures, end + 1);

  if (targetTotal > state.totalMeasures) {
    return buildExpandedMeasuresState(state, targetTotal, next);
  }
  return { songSections: next };
};

export const updateSongSectionState = (
  state: { songSections: SongSection[]; totalMeasures: number; [key: string]: any },
  id: string,
  name: string,
  start: number,
  end: number,
  color?: string,
  level?: number
): Record<string, any> => {
  const next = state.songSections.map(s => 
    (s.id === id || String(s.id) === String(id)) ? { ...s, name, startMeasure: start, endMeasure: end, color: color || s.color, level: level || s.level } : s
  ).sort((a, b) => a.startMeasure - b.startMeasure);

  const targetTotal = Math.max(state.totalMeasures, end + 1);
  if (targetTotal > state.totalMeasures) {
    return buildExpandedMeasuresState(state, targetTotal, next);
  }
  return { songSections: next };
};

export const updateSectionRepeatState = (
  sections: SongSection[],
  id: string,
  count: number
): SongSection[] => sections.map(s => s.id === id ? { ...s, repeatCount: count } : s);

export const deleteSongSectionState = (
  sections: SongSection[],
  id: string
): SongSection[] => sections.filter(s => s.id !== id);

export const createSongMarkerState = (
  markers: SongMarker[],
  name: string,
  measure: number,
  color?: string
): SongMarker[] => {
  const newMarker: SongMarker = {
    id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9),
    name,
    measure,
    color: color || '#f19066',
  };
  return [...markers, newMarker].sort((a, b) => a.measure - b.measure);
};

export const updateSongMarkerState = (
  markers: SongMarker[],
  id: string,
  name: string,
  measure: number,
  color?: string
): SongMarker[] => markers.map(m => 
  m.id === id ? { ...m, name, measure, color: color || m.color } : m
).sort((a, b) => a.measure - b.measure);

export const deleteSongMarkerState = (
  markers: SongMarker[],
  id: string
): SongMarker[] => markers.filter(m => m.id !== id);
