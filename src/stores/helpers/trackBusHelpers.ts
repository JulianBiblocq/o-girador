import { TrackGroup } from '../../types';
import { applyRadii } from './trackRodaGeometryHelpers';
import { selectTracksMeta } from './trackMetaCache';
import { getDisplayedMixerTracks } from './mixerOrderingHelpers';
import { sortTracksHierarchically } from './trackReorderMixerHelper';
import {
  createBaseBusTrack,
  handleCreateLinkGroupState,
  handleCreateCustomLinkGroupState,
} from './trackLinkGroupCreationHelper';

export { handleCreateLinkGroupState, handleCreateCustomLinkGroupState };

export const handleCreateBusState = (
  state: { tracks: TrackGroup[]; tracksVersion: number; [key: string]: any },
  trackId: number,
  name: string
): Record<string, any> => {
  const idx = state.tracks.findIndex((t) => t.id === trackId);
  if (idx === -1) return {};
  const busId = Date.now();
  const bus = createBaseBusTrack(busId, state.tracks[idx].instrumentIdx, name, false, []);
  const updated = state.tracks.map((t) => {
    if (t.id !== trackId) return t;
    const oldLinkParent = t.linkedToTrackId ? state.tracks.find((p) => String(p.id) === String(t.linkedToTrackId)) : null;
    const clearFolderLink = Boolean(oldLinkParent && (oldLinkParent.isBusFolder || oldLinkParent.isLinkFolder));
    return { ...t, busId: String(busId), ...(clearFolderLink ? { linkedToTrackId: undefined } : {}) };
  });
  const next = [...updated.slice(0, idx), bus, ...updated.slice(idx)];
  return { tracks: applyRadii(next, state.rodaTrackOrder), tracksVersion: state.tracksVersion + 1 };
};

export const handleCreateCustomBusState = (
  state: { tracks: TrackGroup[]; tracksVersion: number; [key: string]: any },
  trackIds: number[],
  name: string
): Record<string, any> => {
  if (trackIds.length === 0) return {};
  const indices = trackIds.map((id) => state.tracks.findIndex((t) => t.id === id)).filter((i) => i !== -1);
  if (indices.length === 0) return {};
  const firstIdx = Math.min(...indices);
  const busId = Date.now();
  const bus = createBaseBusTrack(busId, state.tracks[firstIdx].instrumentIdx, name, false, []);
  const updatedSel = state.tracks
    .filter((t) => trackIds.includes(t.id))
    .map((t) => {
      const oldLinkParent = t.linkedToTrackId ? state.tracks.find((p) => String(p.id) === String(t.linkedToTrackId)) : null;
      const clearFolderLink = Boolean(oldLinkParent && (oldLinkParent.isBusFolder || oldLinkParent.isLinkFolder));
      return { ...t, busId: String(busId), ...(clearFolderLink ? { linkedToTrackId: undefined } : {}) };
    });
  const rem = state.tracks.filter((t) => !trackIds.includes(t.id));
  const ins = Math.max(0, Math.min(firstIdx, rem.length));
  const next = [...rem.slice(0, ins), bus, ...updatedSel, ...rem.slice(ins)];
  return { tracks: applyRadii(next, state.rodaTrackOrder), tracksVersion: state.tracksVersion + 1 };
};

export const handleToggleFoldBusState = (
  state: { tracks: TrackGroup[]; mixerBankOffset?: number; tracksVersion: number; [key: string]: any },
  busId: number | string
): Record<string, any> => {
  const nextTracks = state.tracks.map((t) => (String(t.id) === String(busId) ? { ...t, isFolded: !t.isFolded } : t));
  const nextMeta = selectTracksMeta({ ...state, tracks: nextTracks });
  const nextDisplayed = getDisplayedMixerTracks(nextMeta);
  const maxOffset = Math.max(0, nextDisplayed.length - 8);
  const nextMixerBankOffset = Math.min(state.mixerBankOffset || 0, maxOffset);
  return { tracks: nextTracks, tracksVersion: state.tracksVersion + 1, mixerBankOffset: nextMixerBankOffset };
};

export const handleToggleSequencerFoldBusState = (
  tracks: TrackGroup[],
  busId: number | string
): TrackGroup[] => tracks.map((t) => (String(t.id) === String(busId) ? { ...t, isSequencerFolded: !t.isSequencerFolded } : t));

export const handleAssignToBusState = (
  tracks: TrackGroup[],
  trackId: number,
  busId: string | null
): TrackGroup[] => {
  const updated = tracks.map((t) => {
    if (t.id !== trackId) return t;
    const oldLinkParent = t.linkedToTrackId ? tracks.find((p) => String(p.id) === String(t.linkedToTrackId)) : null;
    const wasLinkedToOldFolder = Boolean(
      oldLinkParent && (oldLinkParent.isLinkFolder || oldLinkParent.isBusFolder) && String(oldLinkParent.id) !== String(busId || '')
    );
    return {
      ...t,
      busId: busId || undefined,
      ...(wasLinkedToOldFolder ? { linkedToTrackId: undefined } : {}),
    };
  });
  return applyRadii(sortTracksHierarchically(updated));
};

export const handleSetPatternOverrideState = (
  tracks: TrackGroup[],
  trackId: number,
  measureIdx: number,
  patternId?: number | null
): TrackGroup[] => tracks.map((t) => {
  if (t.id === trackId) {
    const overrides = { ...(t.patternOverrides || {}) };
    if (patternId === undefined || patternId === null) delete overrides[measureIdx];
    else overrides[measureIdx] = patternId;
    return { ...t, patternOverrides: overrides };
  }
  return t;
});
