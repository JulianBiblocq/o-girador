import { TrackGroup } from '../../types';
import { syncPatternAcrossLinkedFamily } from './patternStepLinkedTracksSync';

export const handleTimelinePatternVariationToggleState = (
  tracks: TrackGroup[],
  totalMeasures: number,
  trackId: number,
  patternId: number,
  measureIdx: number,
  val: boolean
): TrackGroup[] => {
  const clicked = tracks.find((t) => t.id === trackId);
  const ownerTrack =
    clicked && clicked.patterns.some((p) => p.id === patternId)
      ? clicked
      : tracks.find((t) => t.isLinkMaster && t.patterns.some((p) => p.id === patternId)) ||
        tracks.find((t) => t.patterns.some((p) => p.id === patternId));
  const targetTrackId = ownerTrack ? ownerTrack.id : trackId;

  return syncPatternAcrossLinkedFamily(tracks, targetTrackId, patternId, (p) => {
    const currentAllow = p.measureAllowVariations ? [...p.measureAllowVariations] : Array(totalMeasures).fill(true);
    currentAllow[measureIdx] = val;
    return { ...p, measureAllowVariations: currentAllow };
  });
};
