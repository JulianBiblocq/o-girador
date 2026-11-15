import { useEffect } from 'react';
import { useWindow } from '../../contexts/WindowContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { getUpperTagName } from '../../utils/crossRealmDom';

interface UseGridShiftShortcutsParams {
  trackId: number;
  patternId: number;
}

export function useGridShiftShortcuts({ trackId, patternId }: UseGridShiftShortcutsParams) {
  const hostWin = useWindow();

  useEffect(() => {
    const hostDoc = hostWin?.document || document;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

      const activeEl = hostDoc.activeElement as HTMLElement | null;
      const tag = getUpperTagName(activeEl);
      if (activeEl && (tag === 'INPUT' || tag === 'TEXTAREA') && !(activeEl as HTMLInputElement).readOnly) {
        if (!activeEl.classList?.contains('step-input-cell')) return;
      }

      e.preventDefault();
      e.stopPropagation();
      const direction: -1 | 1 = e.key === 'ArrowLeft' ? -1 : 1;
      useSequencerStore.getState().shiftPatternSteps(trackId, patternId, direction);
    };

    hostWin.addEventListener('keydown', handleKeyDown);
    return () => hostWin.removeEventListener('keydown', handleKeyDown);
  }, [hostWin, trackId, patternId]);
}
