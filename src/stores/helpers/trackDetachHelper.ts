import { TrackGroup } from '../../types';
import { applyRadii } from './trackRodaGeometryHelpers';

export const resetTrackLink = (t: TrackGroup, patternsToCopy: any[], preserveBusId = false): TrackGroup => ({
  ...t,
  linkedToTrackId: undefined,
  isLinkMaster: undefined,
  ...(preserveBusId ? {} : { busId: undefined }),
  patterns: patternsToCopy.length ? patternsToCopy : t.patterns,
});

export const handleDetachTrackState = (
  state: { tracks: TrackGroup[]; tracksVersion: number; [key: string]: any },
  trackId: number
): Record<string, any> => {
  const target = state.tracks.find((t) => t.id === trackId);
  if (!target) return {};
  let updated = [...state.tracks];

  if (target.linkedToTrackId || target.isLinkMaster) {
    const linkId = target.linkedToTrackId || String(target.id);
    const linkFolder = updated.find((t) => String(t.id) === String(linkId) && t.isLinkFolder);
    const srcPatterns = linkFolder?.patterns || updated.find((t) => String(t.id) === String(linkId))?.patterns;
    const patternsToCopy = srcPatterns ? JSON.parse(JSON.stringify(srcPatterns)) : [];
    const preserveBus = !linkFolder;

    if (target.isLinkMaster) {
      const otherSlaves = updated.filter(
        (t) => t.id !== trackId && String(t.linkedToTrackId) === String(linkId) && !t.isLinkFolder && !t.isBusFolder
      );
      if (otherSlaves.length > 1) {
        const newMasterId = otherSlaves[0].id;
        updated = updated.map((t) => {
          if (t.id === trackId) return resetTrackLink(t, patternsToCopy, preserveBus);
          if (t.id === newMasterId) return { ...t, isLinkMaster: true, ...(linkFolder ? {} : { linkedToTrackId: undefined }) };
          if (!linkFolder && String(t.linkedToTrackId) === String(trackId)) return { ...t, linkedToTrackId: String(newMasterId) };
          return t;
        });
      } else {
        updated = updated.map((t) =>
          t.id === trackId || String(t.linkedToTrackId) === String(linkId) ? resetTrackLink(t, patternsToCopy, preserveBus) : t
        );
        if (linkFolder) updated = updated.filter((t) => String(t.id) !== String(linkId));
      }
    } else {
      updated = updated.map((t) => (t.id === trackId ? resetTrackLink(t, patternsToCopy, preserveBus) : t));
      const remainingSlaves = updated.filter(
        (t) => String(t.linkedToTrackId) === String(linkId) && !t.isLinkMaster && !t.isLinkFolder && !t.isBusFolder
      );
      if (remainingSlaves.length === 0) {
        updated = updated.map((t) =>
          String(t.id) === String(linkId) || String(t.linkedToTrackId) === String(linkId) ? resetTrackLink(t, patternsToCopy, preserveBus) : t
        );
        if (linkFolder) updated = updated.filter((t) => String(t.id) !== String(linkId));
      }
    }
  } else if (target.busId) {
    const busId = target.busId;
    updated = updated.map((t) => (t.id === trackId ? { ...t, busId: undefined } : t));
    if (!updated.some((t) => String(t.busId) === String(busId) && !t.isBusFolder)) {
      updated = updated.filter((t) => String(t.id) !== String(busId));
    }
  }

  return { tracks: applyRadii(updated, state.rodaTrackOrder), tracksVersion: state.tracksVersion + 1 };
};
