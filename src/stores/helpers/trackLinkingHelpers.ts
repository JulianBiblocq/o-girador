import { TrackGroup } from '../../types';
import { applyRadii } from './trackRodaGeometryHelpers';
import { syncMasterPatternsToLinkedFamily } from '../../utils/trackLinkingSync';
import { resetTrackLink, handleDetachTrackState } from './trackDetachHelper';

export { handleDetachTrackState };

export const handleLinkTrackState = (
  state: { tracks: TrackGroup[]; tracksVersion: number; [key: string]: any },
  trackId: number,
  linkedToTrackId: string | null
): Record<string, any> => {
  let updated = [...state.tracks];

  if (linkedToTrackId) {
    const masterTrackId = Number(linkedToTrackId);
    const masterTrack = updated.find((t) => t.id === masterTrackId);

    if (masterTrack) {
      const existingLinkFolder = masterTrack.linkedToTrackId
        ? updated.find((b) => String(b.id) === String(masterTrack.linkedToTrackId) && b.isLinkFolder)
        : undefined;
      const existingPureBus = masterTrack.busId
        ? updated.find((b) => String(b.id) === String(masterTrack.busId) && b.isBusFolder && !b.isLinkFolder)
        : undefined;

      if (existingLinkFolder) {
        const folderIdStr = String(existingLinkFolder.id);
        updated = updated.map((t) =>
          t.id === trackId
            ? { ...t, linkedToTrackId: folderIdStr, busId: folderIdStr, isLinkMaster: false, patternOverrides: undefined }
            : t
        );
      } else if (existingPureBus) {
        const busIdStr = String(existingPureBus.id);
        updated = updated.map((t) => {
          if (t.id === masterTrackId) return { ...t, isLinkMaster: true };
          if (t.id === trackId) {
            return { ...t, busId: t.busId || busIdStr, linkedToTrackId: String(masterTrackId), isLinkMaster: false, patternOverrides: undefined };
          }
          return t;
        });
      } else {
        const newBusId = Date.now();
        const busName = `Groupe ${masterTrack.customName || 'Liaison'}`;
        const clonedPatterns = JSON.parse(JSON.stringify(masterTrack.patterns));
        const newBusTrack: TrackGroup = {
          id: newBusId, instrumentIdx: masterTrack.instrumentIdx, patterns: clonedPatterns,
          isMute: false, isSolo: false, isHidden: false, volumeVal: 75, selectedPatternId: masterTrack.selectedPatternId,
          isBusFolder: true, isLinkFolder: true, isFolded: false, isSequencerFolded: false,
          customName: busName, reverbVal: 0, panVal: 0, pan: 0, fxSends: { reverb: 0, distortion: 0 },
        };
        const masterIndex = updated.findIndex((t) => t.id === masterTrackId);
        updated = updated.map((t) => {
          if (t.id === masterTrackId) return { ...t, busId: String(newBusId), linkedToTrackId: String(newBusId), isLinkMaster: true };
          if (t.id === trackId) return { ...t, busId: String(newBusId), linkedToTrackId: String(newBusId), isLinkMaster: false, patternOverrides: undefined };
          return t;
        });
        updated.splice(masterIndex, 0, newBusTrack);
      }

      const slaveTrack = updated.find((t) => t.id === trackId);
      if (slaveTrack) {
        const anchorIdStr = slaveTrack.linkedToTrackId || String(masterTrackId);
        updated = updated.filter((t) => t.id !== trackId);
        const lastMemberIndex = updated
          .map((t, idx) => (String(t.id) === anchorIdStr || String(t.linkedToTrackId) === anchorIdStr || t.id === masterTrackId ? idx : -1))
          .reduce((max, idx) => Math.max(max, idx), -1);
        if (lastMemberIndex !== -1) updated.splice(lastMemberIndex + 1, 0, slaveTrack);
        else updated.push(slaveTrack);
      }

      updated = syncMasterPatternsToLinkedFamily(updated, masterTrackId).tracks;
    }
  } else {
    const trackToUnlink = updated.find((t) => t.id === trackId);
    if (trackToUnlink) {
      const linkId = trackToUnlink.linkedToTrackId;
      const linkFolder = linkId ? updated.find((t) => String(t.id) === String(linkId) && t.isLinkFolder) : null;
      const directMaster = linkId && !linkFolder ? updated.find((t) => String(t.id) === String(linkId) && !t.isBusFolder) : null;
      const srcPatterns = linkFolder?.patterns || directMaster?.patterns;
      const patternsToCopy = srcPatterns ? JSON.parse(JSON.stringify(srcPatterns)) : [];
      const preserveBus = !linkFolder && Boolean(trackToUnlink.busId);

      if (trackToUnlink.isLinkMaster && linkId && linkFolder) {
        updated = updated.map((t) => (String(t.linkedToTrackId) === String(linkId) ? resetTrackLink(t, patternsToCopy) : t));
        updated = updated.filter((t) => String(t.id) !== String(linkId));
      } else if (trackToUnlink.isLinkMaster) {
        updated = updated.map((t) =>
          t.id === trackId || String(t.linkedToTrackId) === String(trackId) ? resetTrackLink(t, patternsToCopy, true) : t
        );
      } else {
        updated = updated.map((t) => (t.id === trackId ? resetTrackLink(t, patternsToCopy, preserveBus) : t));
      }
    }
  }

  return { tracks: applyRadii(updated, state.rodaTrackOrder), tracksVersion: state.tracksVersion + 1 };
};
