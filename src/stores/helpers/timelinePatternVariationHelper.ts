import { TrackGroup } from '../../types';

export const handleTimelinePatternVariationToggleState = (
  tracks: TrackGroup[],
  totalMeasures: number,
  trackId: number,
  patternId: number,
  measureIdx: number,
  val: boolean
): TrackGroup[] => {
  const ownerTrack = tracks.find(t => t.patterns.some(p => p.id === patternId));
  const targetTrackId = ownerTrack ? ownerTrack.id : trackId;
  return tracks.map(t => {
    if (t.id === targetTrackId) {
      return {
        ...t,
        patterns: t.patterns.map(p => {
          if (p.id === patternId) {
            const currentAllow = p.measureAllowVariations ? [...p.measureAllowVariations] : Array(totalMeasures).fill(true);
            currentAllow[measureIdx] = val;
            return { ...p, measureAllowVariations: currentAllow };
          }
          return p;
        })
      };
    }
    return t;
  });
};
