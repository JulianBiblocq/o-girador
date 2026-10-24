import { TrackGroup } from '../../types';

export const handleResetPatternMicrotimingsState = (
  tracks: TrackGroup[],
  trackId: number,
  patternId: number
): TrackGroup[] => tracks.map((t) => {
  if (t.id === trackId) {
    return {
      ...t,
      patterns: t.patterns.map((p) => {
        if (p.id === patternId) {
          return {
            ...p,
            microtimings: Array(p.steps).fill(0),
            variations: p.variations?.map(v => ({
              ...v,
              microtimings: Array(v.steps.length).fill(0)
            }))
          };
        }
        return p;
      })
    };
  }
  return t;
});
