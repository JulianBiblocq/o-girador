import { TrackGroup } from '../../types';
import { applyRadii } from './trackRodaGeometryHelpers';
import { selectTracksMeta } from './trackMetaCache';
import { getDisplayedMixerTracks } from './mixerOrderingHelpers';

const createBaseBusTrack = (id: number, instIdx: number, customName: string, isLinkFolder = false, patterns: any[] = []): TrackGroup => ({
  id,
  instrumentIdx: instIdx,
  patterns,
  isMute: false,
  isSolo: false,
  isHidden: false,
  volumeVal: 75,
  selectedPatternId: patterns[0]?.id || 0,
  isBusFolder: true,
  isLinkFolder,
  isFolded: false,
  isSequencerFolded: false,
  customName,
  reverbVal: 0,
  panVal: 0,
  pan: 0,
  fxSends: { reverb: 0, distortion: 0 }
});

export const handleCreateLinkGroupState = (
  state: { tracks: TrackGroup[]; tracksVersion: number; [key: string]: any },
  trackId: number,
  name: string
): Record<string, any> => {
  const idx = state.tracks.findIndex(t => t.id === trackId);
  if (idx === -1) return {};
  const master = state.tracks[idx];
  const busId = Date.now();
  const bus = createBaseBusTrack(busId, master.instrumentIdx, name, true, JSON.parse(JSON.stringify(master.patterns)));
  const updated = state.tracks.map(t => t.id === trackId ? { ...t, busId: String(busId), linkedToTrackId: String(busId), isLinkMaster: true } : t);
  const next = [...updated.slice(0, idx), bus, ...updated.slice(idx)];
  return { tracks: applyRadii(next), tracksVersion: state.tracksVersion + 1 };
};

export const handleCreateBusState = (
  state: { tracks: TrackGroup[]; tracksVersion: number; [key: string]: any },
  trackId: number,
  name: string
): Record<string, any> => {
  const idx = state.tracks.findIndex(t => t.id === trackId);
  if (idx === -1) return {};
  const busId = Date.now();
  const bus = createBaseBusTrack(busId, state.tracks[idx].instrumentIdx, name, false, []);
  const updated = state.tracks.map(t => t.id === trackId ? { ...t, busId: String(busId), linkedToTrackId: undefined } : t);
  const next = [...updated.slice(0, idx), bus, ...updated.slice(idx)];
  return { tracks: applyRadii(next), tracksVersion: state.tracksVersion + 1 };
};

export const handleCreateCustomBusState = (
  state: { tracks: TrackGroup[]; tracksVersion: number; [key: string]: any },
  trackIds: number[],
  name: string
): Record<string, any> => {
  if (trackIds.length === 0) return {};
  const indices = trackIds.map(id => state.tracks.findIndex(t => t.id === id)).filter(i => i !== -1);
  if (indices.length === 0) return {};
  const firstIdx = Math.min(...indices);
  const busId = Date.now();
  const bus = createBaseBusTrack(busId, state.tracks[firstIdx].instrumentIdx, name, false, []);
  const updatedSel = state.tracks.filter(t => trackIds.includes(t.id)).map(t => ({ ...t, busId: String(busId), linkedToTrackId: undefined }));
  const rem = state.tracks.filter(t => !trackIds.includes(t.id));
  const ins = Math.max(0, Math.min(firstIdx, rem.length));
  const next = [...rem.slice(0, ins), bus, ...updatedSel, ...rem.slice(ins)];
  return { tracks: applyRadii(next), tracksVersion: state.tracksVersion + 1 };
};

export const handleCreateCustomLinkGroupState = (
  state: { tracks: TrackGroup[]; tracksVersion: number; [key: string]: any },
  masterTrackId: number,
  slaveTrackIds: number[],
  name: string
): Record<string, any> => {
  const master = state.tracks.find(t => t.id === masterTrackId);
  if (!master) return {};
  const busId = Date.now();
  const bus = { ...createBaseBusTrack(busId, master.instrumentIdx, name, true, JSON.parse(JSON.stringify(master.patterns))), busId: master.busId };
  const masterIdx = state.tracks.findIndex(t => t.id === masterTrackId);
  const upMaster = { ...master, busId: String(busId), linkedToTrackId: String(busId), isLinkMaster: true };
  const upSlaves = state.tracks.filter(t => slaveTrackIds.includes(t.id)).map(t => ({ ...t, busId: String(busId), linkedToTrackId: String(busId), isLinkMaster: false }));
  const allIds = [masterTrackId, ...slaveTrackIds];
  const rem = state.tracks.filter(t => !allIds.includes(t.id));
  const ins = Math.max(0, Math.min(masterIdx, rem.length));
  const next = [...rem.slice(0, ins), bus, upMaster, ...upSlaves, ...rem.slice(ins)];
  return { tracks: applyRadii(next), tracksVersion: state.tracksVersion + 1 };
};

export const handleToggleFoldBusState = (
  state: { tracks: TrackGroup[]; mixerBankOffset?: number; tracksVersion: number; [key: string]: any },
  busId: number | string
): Record<string, any> => {
  const nextTracks = state.tracks.map((t) => String(t.id) === String(busId) ? { ...t, isFolded: !t.isFolded } : t);
  const nextMeta = selectTracksMeta({ ...state, tracks: nextTracks });
  const nextDisplayed = getDisplayedMixerTracks(nextMeta);
  const maxOffset = Math.max(0, nextDisplayed.length - 8);
  const nextMixerBankOffset = Math.min(state.mixerBankOffset || 0, maxOffset);
  return { tracks: nextTracks, tracksVersion: state.tracksVersion + 1, mixerBankOffset: nextMixerBankOffset };
};

export const handleToggleSequencerFoldBusState = (
  tracks: TrackGroup[],
  busId: number | string
): TrackGroup[] => tracks.map((t) => String(t.id) === String(busId) ? { ...t, isSequencerFolded: !t.isSequencerFolded } : t);

export const handleAssignToBusState = (
  tracks: TrackGroup[],
  trackId: number,
  busId: string | null
): TrackGroup[] => tracks.map((t) => t.id === trackId ? { ...t, busId: busId || undefined } : t);

export const handleSetPatternOverrideState = (
  tracks: TrackGroup[],
  trackId: number,
  measureIdx: number,
  patternId?: number | null
): TrackGroup[] => tracks.map(t => {
  if (t.id === trackId) {
    const overrides = { ...(t.patternOverrides || {}) };
    if (patternId === undefined || patternId === null) delete overrides[measureIdx];
    else overrides[measureIdx] = patternId;
    return { ...t, patternOverrides: overrides };
  }
  return t;
});

