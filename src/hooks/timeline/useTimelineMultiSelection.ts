
import { useEffect } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTimelineEditStore } from '../../stores/useTimelineEditStore';

function isTrueTextInput(el: Element | null): boolean {
  if (!el) return false;
  if (el.getAttribute('contenteditable') === 'true') return true;
  if (el.tagName === 'TEXTAREA') return true;
  if (el.tagName === 'INPUT') {
    const type = (el as HTMLInputElement).type?.toLowerCase();
    if (['range', 'checkbox', 'radio', 'button', 'submit', 'reset', 'color'].includes(type)) {
      return false;
    }
    return true;
  }
  return false;
}

export interface UseTimelineMultiSelectionParams {
  isPlaying: boolean;
  onTrackStepValueChange?: (trackId: number, patternId: number, stepIdx: number, val: string) => void;
}

export function useTimelineMultiSelection({ isPlaying, onTrackStepValueChange }: UseTimelineMultiSelectionParams) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTrueTextInput(document.activeElement)) return;
      if (isPlaying) return;

      // Ctrl+A / Cmd+A : Sélection globale de toutes les cellules de la timeline
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        e.stopPropagation();
        useSequencerStore.getState().selectAllTimelineCells();
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Escape : Ferme l'éditeur de pas ou vide la sélection multiple
      if (e.key === 'Escape') {
        const isPopupOpen = useTimelineEditStore.getState().activeStepKey !== null;
        if (isPopupOpen) {
          useTimelineEditStore.getState().closeEditor();
          e.preventDefault();
        } else if (useSequencerStore.getState().selectedTimelineCells.length > 0) {
          useSequencerStore.getState().clearTimelineSelection();
          e.preventDefault();
        } else {
          const hovered = (window as any).activeHoveredStep;
          if (hovered && onTrackStepValueChange) {
            onTrackStepValueChange(hovered.trackId, hovered.patternId, hovered.stepIdx, '0');
            e.preventDefault();
          }
        }
        return;
      }

      // Delete / Backspace sur pas individuel survolé si pas de sélection multiple
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const hovered = (window as any).activeHoveredStep;
        if (hovered && onTrackStepValueChange) {
          onTrackStepValueChange(hovered.trackId, hovered.patternId, hovered.stepIdx, '0');
          e.preventDefault();
          return;
        }
      }


      // 0 : Vider le pas survolé
      if (e.key === '0') {
        const hovered = (window as any).activeHoveredStep;
        if (hovered && onTrackStepValueChange) {
          onTrackStepValueChange(hovered.trackId, hovered.patternId, hovered.stepIdx, '0');
          e.preventDefault();
          return;
        }
      }

      // Saisie directe de frappes musicales sur le pas survolé
      const hovered = (window as any).activeHoveredStep;
      if (hovered && Array.isArray(hovered.allowedStrokes) && onTrackStepValueChange) {
        const targetStroke = hovered.allowedStrokes.find((s: string) => String(s).toLowerCase() === e.key.toLowerCase());
        if (targetStroke) {
          e.preventDefault();
          onTrackStepValueChange(hovered.trackId, hovered.patternId, hovered.stepIdx, String(targetStroke));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, onTrackStepValueChange]);
}
