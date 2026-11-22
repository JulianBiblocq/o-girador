/**
 * Création de groupes liés Maître -> Esclaves avec cohabitation Bus Audio & hydratation immédiate (< 95 lignes).
 */
import { TrackGroup } from '../../types';
import { applyRadii } from './trackRodaGeometryHelpers';
import { syncMasterPatternsToLinkedFamily } from '../../utils/trackLinkingSync';

export const createBaseBusTrack = (
  id: number, instIdx: number, customName: string, isLinkFolder = false, patterns: any[] = []
): TrackGroup => ({
  id, instrumentIdx: instIdx, patterns, isMute: false, isSolo: false, isHidden: false, volumeVal: 75,
  selectedPatternId: patterns[0]?.id || 0, isBusFolder: true, isLinkFolder, isFolded: false,
  isSequencerFolded: false, customName, reverbVal: 0, panVal: 0, pan: 0, fxSends: { reverb: 0, distortion: 0 },
});

export const handleCreateLinkGroupState = (
  state: { tracks: TrackGroup[]; tracksVersion: number; [key: string]: any },
  trackId: number,
  name: string
): Record<string, any> => {
  const idx = state.tracks.findIndex((t) => t.id === trackId);
  if (idx === -1) return {};
  const master = state.tracks[idx];
  const busId = Date.now();
  const bus = createBaseBusTrack(busId, master.instrumentIdx, name, true, JSON.parse(JSON.stringify(master.patterns)));
  const updated = state.tracks.map((t) =>
    t.id === trackId ? { ...t, busId: String(busId), linkedToTrackId: String(busId), isLinkMaster: true } : t
  );
  const next = syncMasterPatternsToLinkedFamily([...updated.slice(0, idx), bus, ...updated.slice(idx)], trackId).tracks;
  return { tracks: applyRadii(next, state.rodaTrackOrder), tracksVersion: state.tracksVersion + 1 };
};

export const handleCreateCustomLinkGroupState = (
  state: { tracks: TrackGroup[]; tracksVersion: number; [key: string]: any },
  masterTrackId: number,
  slaveTrackIds: number[],
  name: string
): Record<string, any> => {
  const master = state.tracks.find((t) => t.id === masterTrackId);
  if (!master) return {};

  const allIds = [masterTrackId, ...slaveTrackIds];
  const existingBus = master.busId
    ? state.tracks.find((b) => String(b.id) === String(master.busId) && b.isBusFolder)
    : undefined;

  let nextTracks: TrackGroup[];

  if (existingBus) {
    const busChildren = state.tracks.filter(
      (t) => !t.isBusFolder && !t.isLinkFolder && String(t.busId) === String(existingBus.id)
    );
    const coversWholeBus = busChildren.length > 0 && busChildren.every((c) => allIds.includes(c.id));
    const exBusIdStr = String(existingBus.id);

    if (coversWholeBus) {
      const promotedBus: TrackGroup = {
        ...existingBus,
        isLinkFolder: true,
        customName: name.trim() || existingBus.customName,
        patterns: JSON.parse(JSON.stringify(master.patterns)),
        selectedPatternId: master.selectedPatternId,
      };
      const upMaster: TrackGroup = { ...master, busId: exBusIdStr, linkedToTrackId: exBusIdStr, isLinkMaster: true, isHidden: false };
      const upSlaves = state.tracks
        .filter((t) => slaveTrackIds.includes(t.id))
        .map((t) => ({ ...t, busId: exBusIdStr, linkedToTrackId: exBusIdStr, isLinkMaster: false, patternOverrides: undefined }));
      const busIdx = state.tracks.findIndex((t) => t.id === existingBus.id);
      const rem = state.tracks.filter((t) => t.id !== existingBus.id && !allIds.includes(t.id));
      const ins = Math.max(0, Math.min(busIdx, rem.length));
      nextTracks = [...rem.slice(0, ins), promotedBus, upMaster, ...upSlaves, ...rem.slice(ins)];
    } else {
      const upMaster: TrackGroup = { ...master, isLinkMaster: true, linkedToTrackId: undefined, isHidden: false };
      const upSlaves = state.tracks
        .filter((t) => slaveTrackIds.includes(t.id))
        .map((t) => ({ ...t, busId: t.busId || exBusIdStr, linkedToTrackId: String(masterTrackId), isLinkMaster: false, patternOverrides: undefined }));
      const masterIdx = state.tracks.findIndex((t) => t.id === masterTrackId);
      const rem = state.tracks.filter((t) => !allIds.includes(t.id));
      const ins = Math.max(0, Math.min(masterIdx, rem.length));
      nextTracks = [...rem.slice(0, ins), upMaster, ...upSlaves, ...rem.slice(ins)];
    }
  } else {
    const busId = Date.now();
    const bus = createBaseBusTrack(busId, master.instrumentIdx, name, true, JSON.parse(JSON.stringify(master.patterns)));
    const masterIdx = state.tracks.findIndex((t) => t.id === masterTrackId);
    const upMaster: TrackGroup = { ...master, busId: String(busId), linkedToTrackId: String(busId), isLinkMaster: true, isHidden: false };
    const upSlaves = state.tracks
      .filter((t) => slaveTrackIds.includes(t.id))
      .map((t) => ({ ...t, busId: String(busId), linkedToTrackId: String(busId), isLinkMaster: false, patternOverrides: undefined }));
    const rem = state.tracks.filter((t) => !allIds.includes(t.id));
    const ins = Math.max(0, Math.min(masterIdx, rem.length));
    nextTracks = [...rem.slice(0, ins), bus, upMaster, ...upSlaves, ...rem.slice(ins)];
  }

  const synced = syncMasterPatternsToLinkedFamily(nextTracks, masterTrackId).tracks;
  return { tracks: applyRadii(synced, state.rodaTrackOrder), tracksVersion: state.tracksVersion + 1 };
};
