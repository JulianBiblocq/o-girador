import { TimelineClipboard } from '../helpers/timelineClipboardTypes';

export interface UISlice {
  isLinearDawDetached: boolean;
  isCircleSequencerDetached: boolean;
  isConsoleDetached: boolean;
  isTimelineDetached: boolean;
  isInstrumentEditorDetached: boolean;
  toggleLinearDawDetached: () => void;
  toggleCircleSequencerDetached: () => void;
  toggleConsoleDetached: () => void;
  toggleTimelineDetached: () => void;
  toggleInstrumentEditorDetached: () => void;
  setDetachedPanelsState: (panels: {
    mixer?: boolean;
    roda?: boolean;
    detailEditor?: boolean;
    linearDaw?: boolean;
    timeline?: boolean;
  }) => void;

  timelineContextMenu: {
    x: number;
    y: number;
    trackId: number;
    measureIdx: number;
    patternId: number | null;
  } | null;
  activeTimelineCell: {
    trackId: number;
    measureIdx: number;
  } | null;
  selectedTimelineCells: Array<{ trackId: number; mIdx: number }>;
  selectionAnchorCell: { trackId: number; mIdx: number } | null;
  isMultiSelectMode: boolean;
  timelineClipboard: TimelineClipboard | null;
  openTimelineContextMenu: (data: {
    x: number;
    y: number;
    trackId: number;
    measureIdx: number;
    patternId: number | null;
  }) => void;
  closeTimelineContextMenu: () => void;
  setActiveTimelineCell: (cell: { trackId: number; measureIdx: number } | null) => void;
  selectTimelineCell: (trackId: number, mIdx: number, mode: 'single' | 'toggle' | 'range') => void;
  clearTimelineSelection: () => void;
  toggleMultiSelectMode: () => void;
  duplicateSelectedCells: () => void;
  copyTimelineSelection: () => void;
  cutTimelineSelection: () => void;
  pasteTimelineClipboard: () => void;
  selectAllTimelineCells: () => void;
  selectTrackTimelineCells: (trackId: number, additive?: boolean) => void;
  deleteSelectedTimelineCells: () => void;

  mixerBankOffset: number;
  setMixerBankOffset: (offset: number) => void;
  shiftMixerBank: (delta: number) => void;
  jumpMixerBank8: () => void;
}
