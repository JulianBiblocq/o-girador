import { StateCreator } from 'zustand';
import type { SequencerStore } from '../types/sequencerStoreTypes';
import { selectTracksMeta } from '../helpers/trackMetaCache';
import { getDisplayedMixerTracks } from '../helpers/mixerOrderingHelpers';
import { selectTimelineCellState, selectAllTimelineCellsState, selectTrackTimelineCellsState } from '../helpers/timelineSelectionHelpers';
import { deleteSelectedTimelineCellsState } from '../helpers/timelineCellDeleteHelper';
import { duplicateSelectedCellsState } from '../helpers/timelineCellDuplicateHelper';
import { copyTimelineSelectionState, cutTimelineSelectionState } from '../helpers/timelineClipboardCopyCutHelper';
import { pasteTimelineClipboardState } from '../helpers/timelineClipboardPasteHelper';
import { UISlice } from './uiSliceTypes';

export * from '../helpers/timelineClipboardTypes';
export * from './uiSliceTypes';

export const createUISlice: StateCreator<SequencerStore, [], [], UISlice> = (set, get) => ({
  isLinearDawDetached: false, isCircleSequencerDetached: false, isConsoleDetached: false, isTimelineDetached: false, isInstrumentEditorDetached: false,
  toggleLinearDawDetached: () => {}, toggleCircleSequencerDetached: () => {}, toggleConsoleDetached: () => {}, toggleTimelineDetached: () => {}, toggleInstrumentEditorDetached: () => {},
  setDetachedPanelsState: () => set({
    isLinearDawDetached: false, isCircleSequencerDetached: false, isConsoleDetached: false, isTimelineDetached: false, isInstrumentEditorDetached: false,
  }),

  timelineContextMenu: null,
  activeTimelineCell: null,
  selectedTimelineCells: [],
  selectionAnchorCell: null,
  isMultiSelectMode: false,
  timelineClipboard: null,

  toggleMultiSelectMode: () => set((state) => ({ isMultiSelectMode: !state.isMultiSelectMode })),
  clearTimelineSelection: () => set({ selectedTimelineCells: [], selectionAnchorCell: null }),

  selectTimelineCell: (trackId, mIdx, mode) => {
    set((state) => selectTimelineCellState(state, trackId, mIdx, mode));
  },
  selectAllTimelineCells: () => {
    set((state) => selectAllTimelineCellsState(state));
  },
  selectTrackTimelineCells: (trackId, additive = false) => {
    set((curr) => selectTrackTimelineCellsState(curr, trackId, additive));
  },

  deleteSelectedTimelineCells: () => {
    const state = get();
    const cells = state.selectedTimelineCells.length > 0
      ? state.selectedTimelineCells
      : (state.activeTimelineCell ? [{ trackId: state.activeTimelineCell.trackId, mIdx: state.activeTimelineCell.measureIdx }] : []);
    if (cells.length === 0) return;
    get().pushUndoState();
    set((curr) => deleteSelectedTimelineCellsState(curr, cells));
  },

  duplicateSelectedCells: () => {
    const state = get();
    const cells = state.selectedTimelineCells.length > 0
      ? state.selectedTimelineCells
      : (state.activeTimelineCell ? [{ trackId: state.activeTimelineCell.trackId, mIdx: state.activeTimelineCell.measureIdx }] : []);
    if (cells.length === 0) return;

    const mIndices = cells.map(c => c.mIdx);
    const mMax = Math.max(...mIndices);
    const mMin = Math.min(...mIndices);
    const L = mMax - mMin + 1;
    const maxTargetIdx = mMax + L;

    if (!state.hasFullPlaybackAccess && state.maxMeasuresAllowed !== null && maxTargetIdx >= state.maxMeasuresAllowed) {
      alert(`Limite de ${state.maxMeasuresAllowed} mesures atteinte en version gratuite.`);
      return;
    }
    get().pushUndoState();
    set((curr) => duplicateSelectedCellsState(curr, cells));
  },

  copyTimelineSelection: () => {
    const res = copyTimelineSelectionState(get());
    if (res) set(res);
  },

  cutTimelineSelection: () => {
    const state = get();
    const cells = state.selectedTimelineCells.length > 0
      ? state.selectedTimelineCells
      : (state.activeTimelineCell ? [{ trackId: state.activeTimelineCell.trackId, mIdx: state.activeTimelineCell.measureIdx }] : []);
    if (cells.length === 0) return;
    get().copyTimelineSelection();
    get().pushUndoState();
    set((curr) => cutTimelineSelectionState(curr, cells));
  },

  pasteTimelineClipboard: () => {
    const state = get();
    const clipboard = state.timelineClipboard;
    const activeCell = state.activeTimelineCell || (
      state.selectedTimelineCells && state.selectedTimelineCells.length > 0
        ? { trackId: state.selectedTimelineCells[0].trackId, measureIdx: state.selectedTimelineCells[0].mIdx }
        : null
    );
    if (!clipboard || !activeCell || clipboard.entries.length === 0) return;

    const targetM = activeCell.measureIdx;
    const maxTargetIdx = targetM + clipboard.spanMeasures - 1;

    if (maxTargetIdx >= get().totalMeasures) {
      get().handleTotalMeasuresChange(maxTargetIdx + 1);
    } else {
      get().pushUndoState();
    }
    set((curr) => pasteTimelineClipboardState(curr, clipboard, targetM));
  },

  openTimelineContextMenu: (data) => set({ timelineContextMenu: data }),
  closeTimelineContextMenu: () => set({ timelineContextMenu: null }),
  setActiveTimelineCell: (cell) => set({ activeTimelineCell: cell }),

  mixerBankOffset: 0,
  setMixerBankOffset: (offset) => set({ mixerBankOffset: Math.max(0, offset) }),
  shiftMixerBank: (delta) => {
    const state = get();
    const displayed = getDisplayedMixerTracks(selectTracksMeta(state));
    if (displayed.length <= 8) { set({ mixerBankOffset: 0 }); return; }
    const maxOffset = Math.max(0, displayed.length - 8);
    set({ mixerBankOffset: Math.max(0, Math.min(maxOffset, state.mixerBankOffset + delta)) });
  },
  jumpMixerBank8: () => {
    const state = get();
    const displayed = getDisplayedMixerTracks(selectTracksMeta(state));
    if (displayed.length <= 8) { set({ mixerBankOffset: 0 }); return; }
    let newOffset = state.mixerBankOffset + 8;
    if (newOffset >= displayed.length) newOffset = 0;
    set({ mixerBankOffset: newOffset });
  },
});
