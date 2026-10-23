import { StateCreator } from 'zustand';
import { SongSection, SongMarker, CloudRhythmSignal } from '../../types';
import type { SequencerStore } from '../types/sequencerStoreTypes';
import type { StructureSlice } from './songStructureSliceTypes';
import { createTransportSlice } from './transportSlice';
import {
  createSongSectionState,
  updateSongSectionState,
  updateSectionRepeatState,
  deleteSongSectionState,
  createSongMarkerState,
  updateSongMarkerState,
  deleteSongMarkerState
} from '../helpers/timelineSectionHelpers';
import { stretchSongSectionState } from '../helpers/timelineStretchHelper';
import { duplicateSectionBlockState } from '../helpers/timelineBlockDuplicationHelper';
import {
  selectAutomationMeasureState,
  clearAutomationSelectionState,
  setGroupedAutomationValueState
} from '../helpers/timelineAutomationSelectionHelper';

export type { StructureSlice };

export const createStructureSlice: StateCreator<SequencerStore, [], [], StructureSlice> = (set, get, api) => ({
  ...createTransportSlice(set, get, api),
  songSections: [],
  songMarkers: [],
  mestreSignals: [],
  selectedAutomationType: null,
  selectedAutomationTrackId: null,
  selectedAutomationRange: null,
  automationAnchorMeasure: null,

  setSongSections: (updater) => set(s => ({ songSections: typeof updater === 'function' ? (updater as any)(s.songSections) : updater })),
  setSongMarkers: (updater) => set((s) => ({ songMarkers: typeof updater === 'function' ? updater(s.songMarkers) : updater })),
  setMestreSignals: (signals) => set({ mestreSignals: signals }),

  selectAutomationMeasure: (type, measureIdx, isShift, trackId = null) => {
    set((state) => selectAutomationMeasureState(state, type, measureIdx, isShift, trackId));
  },
  clearAutomationSelection: () => set(clearAutomationSelectionState()),
  setGroupedAutomationValue: (type, value, trackId = null) => {
    get().pushUndoState();
    set((state) => setGroupedAutomationValueState(state, type, value, trackId));
  },

  duplicateSectionBlock: (startIdx, endIdx, targetIdx, copiesCount) => {
    get().pushUndoState();
    set((state) => duplicateSectionBlockState(state, startIdx, endIdx, targetIdx, copiesCount));
  },

  handleCreateSongSection: (name, start, end, color, repeatCount, level) => {
    get().pushUndoState();
    set((state) => createSongSectionState(state, name, start, end, color, repeatCount, level));
  },
  handleUpdateSongSection: (id, name, start, end, color, level) => {
    get().pushUndoState();
    set((state) => updateSongSectionState(state, id, name, start, end, color, level));
  },
  handleUpdateSectionRepeat: (id, count) => {
    get().pushUndoState();
    set((state) => ({ songSections: updateSectionRepeatState(state.songSections, id, count) }));
  },
  handleDeleteSongSection: (id) => {
    get().pushUndoState();
    set((state) => ({ songSections: deleteSongSectionState(state.songSections, id) }));
  },

  stretchSongSection: (sectionId, newEndMeasure, mode) => {
    get().pushUndoState();
    set((state) => stretchSongSectionState(state, sectionId, newEndMeasure, mode));
  },

  handleCreateSongMarker: (name, measure, color) => {
    get().pushUndoState();
    set((state) => ({ songMarkers: createSongMarkerState(state.songMarkers, name, measure, color) }));
  },
  handleUpdateSongMarker: (id, name, measure, color) => {
    get().pushUndoState();
    set((state) => ({ songMarkers: updateSongMarkerState(state.songMarkers, id, name, measure, color) }));
  },
  handleDeleteSongMarker: (id) => {
    get().pushUndoState();
    set((state) => ({ songMarkers: deleteSongMarkerState(state.songMarkers, id) }));
  },
});
