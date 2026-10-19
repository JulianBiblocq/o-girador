import { StateCreator } from 'zustand';
import { TrackGroup } from '../../types';
import type { SequencerStore } from '../useSequencerStore';
import { handleReorderRodaTracksState, handleReorderWagonState } from '../helpers/trackReorderRodaWagonHelper';
import { handleReorderMixerTracksState } from '../helpers/trackReorderMixerHelper';
import { handleLinkTrackState, handleDetachTrackState } from '../helpers/trackLinkingHelpers';
import {
  handleCreateLinkGroupState,
  handleCreateBusState,
  handleCreateCustomBusState,
  handleCreateCustomLinkGroupState,
  handleToggleFoldBusState,
  handleToggleSequencerFoldBusState,
  handleAssignToBusState,
  handleSetPatternOverrideState
} from '../helpers/trackBusHelpers';

export interface TrackHierarchySlice {
  handleReorderRodaTracks: (activeId: number, overId: number) => void;
  handleReorderMixerTracks: (activeId: number, overId: number) => void;
  handleReorderWagon: (wagonTrackIds: number[], overTrackId: number) => void;
  handleReorderTracksDnd: (activeId: number, overId: number) => void;
  handleLinkTrack: (trackId: number, linkedToTrackId: string | null) => void;
  handleDetachTrack: (trackId: number) => void;
  handleCreateLinkGroup: (trackId: number, name: string) => void;
  handleCreateBus: (trackId: number, name: string) => void;
  handleCreateCustomBus: (trackIds: number[], name: string) => void;
  handleCreateCustomLinkGroup: (masterTrackId: number, slaveTrackIds: number[], name: string) => void;
  handleSetPatternOverride: (trackId: number, measureIdx: number, patternId?: number | null) => void;
  handleAssignToBus: (trackId: number, busId: string | null) => void;
  handleToggleFoldBus: (busId: number | string) => void;
  handleToggleSequencerFoldBus: (busId: number | string) => void;
}

export const createTrackHierarchySlice: StateCreator<SequencerStore, [], [], TrackHierarchySlice> = (set, get) => ({
  handleReorderRodaTracks: (activeId, overId) => {
    if (activeId === overId) return;
    get().pushUndoState();
    set(state => handleReorderRodaTracksState(state, activeId, overId));
  },

  handleReorderMixerTracks: (activeId, overId) => {
    if (activeId === overId) return;
    get().pushUndoState();
    set(state => handleReorderMixerTracksState(state, activeId, overId));
  },

  handleReorderWagon: (wagonTrackIds, overTrackId) => {
    if (!wagonTrackIds || wagonTrackIds.length === 0 || wagonTrackIds.includes(overTrackId)) return;
    get().pushUndoState();
    set(state => handleReorderWagonState(state, wagonTrackIds, overTrackId));
  },

  handleReorderTracksDnd: (activeId, overId) => get().handleReorderMixerTracks(activeId, overId),

  handleLinkTrack: (trackId, linkedToTrackId) => {
    get().pushUndoState();
    set(state => handleLinkTrackState(state, trackId, linkedToTrackId));
  },

  handleDetachTrack: (trackId) => {
    get().pushUndoState();
    set(state => handleDetachTrackState(state, trackId));
  },

  handleCreateLinkGroup: (trackId, name) => {
    get().pushUndoState();
    set(state => handleCreateLinkGroupState(state, trackId, name));
  },

  handleCreateBus: (trackId, name) => {
    get().pushUndoState();
    set(state => handleCreateBusState(state, trackId, name));
  },

  handleCreateCustomBus: (trackIds, name) => {
    get().pushUndoState();
    set(state => handleCreateCustomBusState(state, trackIds, name));
  },

  handleCreateCustomLinkGroup: (masterTrackId, slaveTrackIds, name) => {
    get().pushUndoState();
    set(state => handleCreateCustomLinkGroupState(state, masterTrackId, slaveTrackIds, name));
  },

  handleSetPatternOverride: (trackId, measureIdx, patternId) => {
    get().pushUndoState();
    set(state => ({
      tracks: handleSetPatternOverrideState(state.tracks, trackId, measureIdx, patternId),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  handleAssignToBus: (trackId, busId) => {
    get().pushUndoState();
    set(state => ({
      tracks: handleAssignToBusState(state.tracks, trackId, busId),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  handleToggleFoldBus: (busId) => {
    set(state => handleToggleFoldBusState(state, busId));
  },

  handleToggleSequencerFoldBus: (busId) => {
    set(state => ({
      tracks: handleToggleSequencerFoldBusState(state.tracks, busId),
      tracksVersion: state.tracksVersion + 1
    }));
  },
});
