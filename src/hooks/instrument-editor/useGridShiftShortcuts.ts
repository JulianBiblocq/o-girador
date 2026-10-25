import { useEffect } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';

interface UseGridShiftShortcutsParams {
  trackId: number;
  patternId: number;
}

export function useGridShiftShortcuts({ trackId, patternId }: UseGridShiftShortcutsParams) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && !(activeEl as HTMLInputElement).readOnly) {
        if (!activeEl.classList.contains('step-input-cell')) return;
      }

      e.preventDefault();
      e.stopPropagation();
      const direction: -1 | 1 = e.key === 'ArrowLeft' ? -1 : 1;
      useSequencerStore.getState().shiftPatternSteps(trackId, patternId, direction);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [trackId, patternId]);
}
