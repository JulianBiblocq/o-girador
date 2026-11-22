import { extractSectionData } from '../../components/sections/sectionDataExtractor';
import { SavedSectionData, SongSection, TrackGroup } from '../../types';
import { applySectionImportToState } from '../../utils/sections/sectionImportEngine';

export interface CopiedSectionData {
  length: number;
  name: string;
  color: string;
  repeatCount: number;
  level?: number;
  assignments: { [trackId: number]: (number | null)[] };
  childSections?: any[];
  sectionPayload?: SavedSectionData;
}

export const copySongSectionData = (
  tracks: TrackGroup[],
  songSections: SongSection[],
  section: SongSection,
  fullState?: Record<string, any>
): CopiedSectionData => {
  const length = section.endMeasure - section.startMeasure + 1;
  const assignments: { [trackId: number]: (number | null)[] } = {};

  tracks.forEach((t) => {
    const arr: (number | null)[] = [];
    for (let m = section.startMeasure; m <= section.endMeasure; m++) {
      const assignedPattern = t.patterns.find((p) => p.measureAssignments?.[m]);
      arr.push(assignedPattern ? assignedPattern.id : null);
    }
    assignments[t.id] = arr;
  });

  const sectionPayload = extractSectionData(section, {
    tracks,
    songSections,
    timeSig: fullState?.timeSig || '4/4',
    bpm: fullState?.bpm || 100,
    measureTimeSigs: fullState?.measureTimeSigs || [],
    measureBpms: fullState?.measureBpms || [],
    measureBpmTransitions: fullState?.measureBpmTransitions || [],
    measureVols: fullState?.measureVols || [],
    measureVolTransitions: fullState?.measureVolTransitions || [],
    measureSignals: fullState?.measureSignals || [],
  });

  return {
    length,
    name: section.name,
    color: section.color || '#f19066',
    repeatCount: section.repeatCount || 1,
    level: section.level,
    assignments,
    childSections: sectionPayload.childSections,
    sectionPayload,
  };
};

export const pasteSongSectionState = (
  stateOrTracks: TrackGroup[] | Record<string, any>,
  songSections: SongSection[],
  totalMeasures: number,
  copied: CopiedSectionData,
  destStartMeasure: number,
  hasFullPlaybackAccess: boolean,
  maxMeasuresAllowed: number | null
): { patch?: Record<string, any>; tracks: TrackGroup[]; songSections?: SongSection[]; totalMeasures?: number; error?: string } => {
  const baseState: Record<string, any> = Array.isArray(stateOrTracks)
    ? { tracks: stateOrTracks, songSections, totalMeasures, hasFullPlaybackAccess, maxMeasuresAllowed }
    : { ...stateOrTracks, hasFullPlaybackAccess, maxMeasuresAllowed };

  if (copied.sectionPayload) {
    const res = applySectionImportToState(baseState, copied.sectionPayload, destStartMeasure, {
      mode: 'overwrite',
      createMissingTracks: false,
      sectionName: copied.name,
      sectionColor: copied.color,
      repeatCount: copied.repeatCount,
      level: copied.level ?? 0,
    });
    if (res.blockedByLimit || !res.patch) {
      return { tracks: baseState.tracks, error: `Limite de ${maxMeasuresAllowed} mesures atteinte en version gratuite.` };
    }
    return {
      patch: res.patch,
      tracks: res.patch.tracks,
      songSections: res.patch.songSections,
      totalMeasures: res.patch.totalMeasures,
    };
  }

  const end = destStartMeasure + copied.length - 1;
  if (!hasFullPlaybackAccess && maxMeasuresAllowed !== null && end + 1 > maxMeasuresAllowed) {
    return { tracks: baseState.tracks, error: `Limite de ${maxMeasuresAllowed} mesures atteinte en version gratuite.` };
  }
  const nextTracks = (baseState.tracks as TrackGroup[]).map((t) => {
    const copiedArr = copied.assignments?.[t.id];
    return {
      ...t,
      patterns: t.patterns.map((p) => {
        const assign = [...(p.measureAssignments || [])];
        while (assign.length <= end) assign.push(false);
        for (let i = 0; i < copied.length; i++) assign[destStartMeasure + i] = copiedArr ? p.id === copiedArr[i] : false;
        return { ...p, measureAssignments: assign };
      }),
    };
  });
  return { tracks: nextTracks, totalMeasures: end >= totalMeasures ? end + 1 : undefined };
};
