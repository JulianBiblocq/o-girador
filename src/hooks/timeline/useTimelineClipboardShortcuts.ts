import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { isDetailEditorOpen } from '../../components/controls/vuMeterTicker';

export function handleTimelineClipboardKeyDown(e: KeyboardEvent, isTextEntry: boolean): boolean {
  if (isTextEntry || isDetailEditorOpen() || useSequencerSettingsStore.getState().isSettingsOpen) {
    return false;
  }
  const store = useSequencerStore.getState();

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
    e.preventDefault(); e.stopPropagation();
    if (store.selectedTimelineCells && store.selectedTimelineCells.length > 0) {
      store.duplicateSelectedCells();
    } else if (store.activeTimelineCell) {
      const { trackId, measureIdx } = store.activeTimelineCell;
      store.duplicateMeasurePattern(trackId, measureIdx, measureIdx + 1);
      store.setActiveTimelineCell({ trackId, measureIdx: measureIdx + 1 });
    }
    return true;
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
    if (store.activeTimelineCell || (store.selectedTimelineCells && store.selectedTimelineCells.length > 0)) {
      e.preventDefault(); e.stopPropagation();
      store.copyTimelineSelection();
      return true;
    }
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
    if (store.activeTimelineCell || (store.selectedTimelineCells && store.selectedTimelineCells.length > 0)) {
      e.preventDefault(); e.stopPropagation();
      store.cutTimelineSelection();
      return true;
    }
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
    if (store.copiedSection) {
      let targetM: number | null = null;
      if (store.activeTimelineCell) {
        targetM = (store.activeTimelineCell as any).mIdx ?? store.activeTimelineCell.measureIdx;
      } else if (store.selectedTimelineCells?.length) {
        targetM = store.selectedTimelineCells[0].mIdx;
      } else if (typeof store.currentMeasure === 'number') {
        targetM = store.currentMeasure;
      }
      if (targetM !== null) {
        e.preventDefault(); e.stopPropagation();
        store.handlePasteSongSection(targetM);
        return true;
      }
    }
    if (store.timelineClipboard && (store.activeTimelineCell || store.selectedTimelineCells?.length)) {
      e.preventDefault(); e.stopPropagation();
      store.pasteTimelineClipboard();
      return true;
    }
  }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (store.selectedTimelineCells.length > 0 || store.activeTimelineCell) {
      e.preventDefault(); e.stopPropagation();
      store.deleteSelectedTimelineCells();
      return true;
    }
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
    e.preventDefault(); e.stopPropagation();
    store.selectAllTimelineCells();
    return true;
  }

  return false;
}
