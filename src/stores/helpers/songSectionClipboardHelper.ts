import { TrackGroup, SongSection } from '../../types';

export interface CopiedSectionData {
  length: number;
  name: string;
  color: string;
  repeatCount: number;
  level?: number;
  assignments: { [trackId: number]: (number | null)[] };
  childSections?: any[];
}

export const copySongSectionData = (
  tracks: TrackGroup[],
  songSections: SongSection[],
  section: SongSection
): CopiedSectionData => {
  const length = section.endMeasure - section.startMeasure + 1;
  const assignments: { [trackId: number]: (number | null)[] } = {};

  tracks.forEach(t => {
    const arr: (number | null)[] = [];
    for (let m = section.startMeasure; m <= section.endMeasure; m++) {
      const assignedPattern = t.patterns.find(p => p.measureAssignments[m]);
      arr.push(assignedPattern ? assignedPattern.id : null);
    }
    assignments[t.id] = arr;
  });

  const childSections = songSections.filter(s => 
    s.id !== section.id && 
    s.startMeasure >= section.startMeasure && 
    s.endMeasure <= section.endMeasure
  ).map(s => ({
    ...s,
    relativeStart: s.startMeasure - section.startMeasure,
    relativeEnd: s.endMeasure - section.startMeasure
  }));

  return {
    length,
    name: section.name,
    color: section.color || '#27ae60',
    repeatCount: section.repeatCount || 1,
    level: section.level,
    assignments,
    childSections
  };
};

export const pasteSongSectionState = (
  tracks: TrackGroup[],
  songSections: SongSection[],
  totalMeasures: number,
  copied: CopiedSectionData,
  destStartMeasure: number,
  hasFullPlaybackAccess: boolean,
  maxMeasuresAllowed: number | null
): { tracks: TrackGroup[]; songSections?: SongSection[]; totalMeasures?: number; error?: string } => {
  const len = copied.length;
  const end = destStartMeasure + len - 1;

  let newTotalMeasures: number | undefined = undefined;
  if (end >= totalMeasures) {
    const proposedTotal = end + 1;
    if (!hasFullPlaybackAccess && maxMeasuresAllowed !== null && proposedTotal > maxMeasuresAllowed) {
      return { tracks, error: `Limite de ${maxMeasuresAllowed} mesures atteinte en version gratuite.` };
    }
    newTotalMeasures = proposedTotal;
  }

  const nextTracks = tracks.map(t => {
    const copiedArr = copied.assignments[t.id];
    if (!copiedArr) return t;

    const nextPatterns = t.patterns.map(p => {
      const assign = [...p.measureAssignments];
      while (assign.length <= end) assign.push(false);
      
      for (let i = 0; i < len; i++) {
        const mIdx = destStartMeasure + i;
        assign[mIdx] = p.id === copiedArr[i];
      }
      return { ...p, measureAssignments: assign };
    });
    return { ...t, patterns: nextPatterns };
  });

  let nextSections: SongSection[] | undefined = undefined;
  if (copied.childSections && copied.childSections.length > 0) {
    nextSections = songSections ? [...songSections] : [];
    copied.childSections.forEach((child: any) => {
      nextSections!.push({
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        name: child.name,
        startMeasure: destStartMeasure + child.relativeStart,
        endMeasure: destStartMeasure + child.relativeEnd,
        color: child.color,
        repeatCount: child.repeatCount,
        level: child.level
      });
    });
  }

  return {
    tracks: nextTracks,
    songSections: nextSections,
    totalMeasures: newTotalMeasures
  };
};
