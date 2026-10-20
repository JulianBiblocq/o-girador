import { TrackGroup, Pattern, TimeSignature } from '../../types';
import { resizePatternBeatResolution, resizePatternAllBeatsResolution, clampStepIndex } from '../../utils/vocalTimingUtils';

export const handleTrackStepsChangeState = (
  tracks: TrackGroup[],
  trackId: number,
  patternId: number,
  targetSteps: number
): TrackGroup[] => tracks.map((t) => {
  if (t.id === trackId) {
    return {
      ...t,
      patterns: t.patterns.map(p => {
        if (p.id === patternId) {
          const arrSteps = Array(targetSteps).fill(0);
          const arrLyrics = Array(targetSteps).fill('');
          const arrNotes = Array(targetSteps).fill('');
          const arrVols = Array(targetSteps).fill(80);
          const arrDecays = Array(targetSteps).fill(100);
          const arrMicro = Array(targetSteps).fill(0);

          for (let i = 0; i < Math.min(targetSteps, p.steps); i++) {
            arrSteps[i] = p.activeSteps[i];
            arrLyrics[i] = p.lyrics?.[i] || '';
            arrNotes[i] = p.notes?.[i] || '';
            if (p.volumes && p.volumes[i] !== undefined) arrVols[i] = p.volumes[i];
            if (p.decays && p.decays[i] !== undefined) arrDecays[i] = p.decays[i];
            if (p.microtimings && p.microtimings[i] !== undefined) arrMicro[i] = p.microtimings[i];
          }

          return {
            ...p,
            steps: targetSteps,
            activeSteps: arrSteps,
            lyrics: arrLyrics,
            notes: arrNotes,
            volumes: arrVols,
            decays: arrDecays,
            microtimings: arrMicro,
          };
        }
        return p;
      })
    };
  }
  return t;
});

export const handlePatternBeatResolutionChangeState = (
  tracks: TrackGroup[],
  patternId: number,
  beatIndex: number,
  newResolution: number,
  timeSig: TimeSignature,
  selectedPatternId: number | null,
  selectedStepIdx: number | null
): { tracks: TrackGroup[]; selectedStepIdx: number | null } => {
  let targetPatternSteps: number | null = null;
  const updatedTracks = tracks.map(t => ({
    ...t,
    patterns: t.patterns.map(p => {
      if (p.id === patternId) {
        const { updatedPattern, targetSteps } = resizePatternBeatResolution(p, beatIndex, newResolution, timeSig);
        targetPatternSteps = targetSteps;
        return updatedPattern as Pattern;
      }
      return p;
    })
  }));

  const nextSelectedStep = (selectedPatternId === patternId && targetPatternSteps !== null)
    ? clampStepIndex(selectedStepIdx, targetPatternSteps)
    : selectedStepIdx;

  return { tracks: updatedTracks, selectedStepIdx: nextSelectedStep };
};

export const handleSetPatternAllBeatsResolutionState = (
  tracks: TrackGroup[],
  patternId: number,
  newResolution: number,
  timeSig: TimeSignature,
  selectedPatternId: number | null,
  selectedStepIdx: number | null
): { tracks: TrackGroup[]; selectedStepIdx: number | null } => {
  let targetPatternSteps: number | null = null;
  const updatedTracks = tracks.map(t => ({
    ...t,
    patterns: t.patterns.map(p => {
      if (p.id === patternId) {
        const { updatedPattern, targetSteps } = resizePatternAllBeatsResolution(p, newResolution, timeSig);
        targetPatternSteps = targetSteps;
        return updatedPattern as Pattern;
      }
      return p;
    })
  }));

  const nextSelectedStep = (selectedPatternId === patternId && targetPatternSteps !== null)
    ? clampStepIndex(selectedStepIdx, targetPatternSteps)
    : selectedStepIdx;

  return { tracks: updatedTracks, selectedStepIdx: nextSelectedStep };
};
