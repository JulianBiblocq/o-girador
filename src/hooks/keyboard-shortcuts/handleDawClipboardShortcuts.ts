
import { useSequencerStore } from '../../stores/useSequencerStore';
import { isActualTextEntry } from './isActualTextEntry';
import { isDetailEditorOpen } from '../../components/controls/vuMeterTicker';

interface DawClipboardParams {
  e: KeyboardEvent;
  handleUndo?: () => void;
  handleRedo?: () => void;
}

export function handleDawClipboardShortcuts({ e, handleUndo, handleRedo }: DawClipboardParams): boolean {
  if (!e.ctrlKey && !e.metaKey) return false;
  const key = e.key.toLowerCase();

  if (key === 'z') {
    e.preventDefault();
    if (e.shiftKey) {
      if (handleRedo) handleRedo();
      else useSequencerStore.getState().handleRedo();
    } else {
      if (handleUndo) handleUndo();
      else useSequencerStore.getState().handleUndo();
    }
    return true;
  }

  if (key === 'y') {
    e.preventDefault();
    if (handleRedo) handleRedo();
    else useSequencerStore.getState().handleRedo();
    return true;
  }

  if (['c', 'x', 'v'].includes(key)) {
    const store = useSequencerStore.getState();
    const hasTimelineTarget = Boolean(
      store.activeTimelineCell || (store.selectedTimelineCells && store.selectedTimelineCells.length > 0)
    );
    if (key === 'v' && store.copiedSection) {
      let targetMeasureIdx: number | null = null;
      if (store.activeTimelineCell) {
        targetMeasureIdx = (store.activeTimelineCell as any).mIdx ?? store.activeTimelineCell.measureIdx;
      } else if (store.selectedTimelineCells && store.selectedTimelineCells.length > 0) {
        targetMeasureIdx = store.selectedTimelineCells[0].mIdx;
      } else if (typeof store.currentMeasure === 'number') {
        targetMeasureIdx = store.currentMeasure;
      }
      if (targetMeasureIdx !== null) {
        e.preventDefault();
        e.stopPropagation();
        store.handlePasteSongSection(targetMeasureIdx);
        return true;
      }
    }
    if (hasTimelineTarget) {
      e.preventDefault();
      e.stopPropagation();
      if (key === 'c') store.copyTimelineSelection();
      else if (key === 'x') store.cutTimelineSelection();
      else if (key === 'v') {
        if (store.copiedSection) {
          let targetMeasureIdx: number | null = null;
          if (store.activeTimelineCell) {
            targetMeasureIdx = (store.activeTimelineCell as any).mIdx ?? store.activeTimelineCell.measureIdx;
          } else if (store.selectedTimelineCells && store.selectedTimelineCells.length > 0) {
            targetMeasureIdx = store.selectedTimelineCells[0].mIdx;
          } else if (typeof store.currentMeasure === 'number') {
            targetMeasureIdx = store.currentMeasure;
          }
          if (targetMeasureIdx !== null) store.handlePasteSongSection(targetMeasureIdx);
        } else if (store.timelineClipboard && (store.activeTimelineCell || (store.selectedTimelineCells && store.selectedTimelineCells.length > 0))) {
          store.pasteTimelineClipboard();
        }
      }
      return true;
    }
  }

  if (key === 'a') {
    if (isActualTextEntry(document.activeElement as HTMLElement | null)) return false;
    if (!isDetailEditorOpen()) {
      e.preventDefault();
      e.stopPropagation();
      useSequencerStore.getState().selectAllTimelineCells();
      return true;
    }
  }

  if (['a', 'x', 'c', 'v', 'd'].includes(key)) {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('grid-shortcut', { detail: { key } }));
    return true;
  }

  return false;
}
