import { TrackGroup } from '../../types';
import { applyRadii } from './trackRodaGeometryHelpers';

const resetTrackLink = (t: TrackGroup, patternsToCopy: any[]): TrackGroup => ({
  ...t,
  linkedToTrackId: undefined,
  isLinkMaster: undefined,
  busId: undefined,
  patterns: patternsToCopy.length ? patternsToCopy : t.patterns
});

export const handleLinkTrackState = (
  state: { tracks: TrackGroup[]; tracksVersion: number; [key: string]: any },
  trackId: number,
  linkedToTrackId: string | null
): Record<string, any> => {
  let updated = [...state.tracks];

  if (linkedToTrackId) {
    const masterTrackId = Number(linkedToTrackId);
    const masterTrack = updated.find(t => t.id === masterTrackId);

    if (masterTrack) {
      let targetBusId = masterTrack.linkedToTrackId;

      if (!targetBusId) {
        const newBusId = Date.now();
        const busName = `Groupe ${masterTrack.customName || 'Liaison'}`;
        const clonedPatterns = JSON.parse(JSON.stringify(masterTrack.patterns));

        const newBusTrack: TrackGroup = {
          id: newBusId,
          instrumentIdx: masterTrack.instrumentIdx,
          patterns: clonedPatterns,
          isMute: false,
          isSolo: false,
          isHidden: false,
          volumeVal: 75,
          selectedPatternId: masterTrack.selectedPatternId,
          isBusFolder: true,
          isLinkFolder: true,
          isFolded: false,
          isSequencerFolded: false,
          customName: busName,
          reverbVal: 0,
          panVal: 0,
          pan: 0,
          fxSends: { reverb: 0, distortion: 0 }
        };

        const masterIndex = updated.findIndex(t => t.id === masterTrackId);
        updated = updated.map(t => t.id === masterTrackId ? { ...t, busId: String(newBusId), linkedToTrackId: String(newBusId), isLinkMaster: true } : t);
        updated.splice(masterIndex, 0, newBusTrack);
        targetBusId = String(newBusId);
      }

      updated = updated.map(t => t.id === trackId ? { ...t, linkedToTrackId: targetBusId, busId: targetBusId, isLinkMaster: false } : t);

      const slaveTrack = updated.find(t => t.id === trackId);
      if (slaveTrack) {
        updated = updated.filter(t => t.id !== trackId);
        const lastMemberIndex = updated.map((t, idx) => (String(t.id) === String(targetBusId) || String(t.busId) === String(targetBusId)) ? idx : -1).reduce((max, idx) => Math.max(max, idx), -1);
        if (lastMemberIndex !== -1) updated.splice(lastMemberIndex + 1, 0, slaveTrack);
        else updated.push(slaveTrack);
      }
    }
  } else {
    const trackToUnlink = updated.find(t => t.id === trackId);
    if (trackToUnlink) {
      const busId = trackToUnlink.linkedToTrackId;
      const busTrack = busId ? updated.find(t => String(t.id) === String(busId) && t.isLinkFolder) : null;
      const patternsToCopy = busTrack ? JSON.parse(JSON.stringify(busTrack.patterns)) : [];

      if (trackToUnlink.isLinkMaster && busId) {
        updated = updated.map(t => String(t.linkedToTrackId) === String(busId) ? resetTrackLink(t, patternsToCopy) : t);
        updated = updated.filter(t => String(t.id) !== String(busId));
      } else {
        updated = updated.map(t => t.id === trackId ? resetTrackLink(t, patternsToCopy) : t);
      }
    }
  }

  return {
    tracks: applyRadii(updated),
    tracksVersion: state.tracksVersion + 1
  };
};

export const handleDetachTrackState = (
  state: { tracks: TrackGroup[]; tracksVersion: number; [key: string]: any },
  trackId: number
): Record<string, any> => {
  const target = state.tracks.find(t => t.id === trackId);
  if (!target) return {};

  let updated = [...state.tracks];

  if (target.linkedToTrackId) {
    const busId = target.linkedToTrackId;
    const busTrack = updated.find(t => String(t.id) === String(busId) && t.isLinkFolder);
    const patternsToCopy = busTrack ? JSON.parse(JSON.stringify(busTrack.patterns)) : [];

    if (target.isLinkMaster) {
      const otherSlaves = updated.filter(t => t.id !== trackId && String(t.linkedToTrackId) === String(busId) && !t.isLinkFolder);
      if (otherSlaves.length > 1) {
        const newMasterId = otherSlaves[0].id;
        updated = updated.map(t => {
          if (t.id === trackId) return resetTrackLink(t, patternsToCopy);
          if (t.id === newMasterId) return { ...t, isLinkMaster: true };
          return t;
        });
      } else {
        updated = updated.map(t => String(t.linkedToTrackId) === String(busId) ? resetTrackLink(t, patternsToCopy) : t);
        updated = updated.filter(t => String(t.id) !== String(busId));
      }
    } else {
      updated = updated.map(t => t.id === trackId ? resetTrackLink(t, patternsToCopy) : t);
      const remainingSlaves = updated.filter(t => String(t.linkedToTrackId) === String(busId) && !t.isLinkMaster && !t.isLinkFolder);
      if (remainingSlaves.length === 0) {
        updated = updated.map(t => String(t.linkedToTrackId) === String(busId) ? resetTrackLink(t, patternsToCopy) : t);
        updated = updated.filter(t => String(t.id) !== String(busId));
      }
    }
  } else if (target.busId) {
    const busId = target.busId;
    updated = updated.map(t => t.id === trackId ? { ...t, busId: undefined } : t);
    const remainingChildren = updated.filter(t => String(t.busId) === String(busId) && !t.isBusFolder);
    if (remainingChildren.length === 0) {
      updated = updated.filter(t => String(t.id) !== String(busId));
    }
  }

  return {
    tracks: applyRadii(updated),
    tracksVersion: state.tracksVersion + 1
  };
};
