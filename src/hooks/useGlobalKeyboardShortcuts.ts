/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { useAudio } from '../contexts/AudioContext';
import { useSequencer } from '../contexts/SequencerContext';
import { inputManager } from './useAudioSync';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../stores/useSequencerSettingsStore';
import { isActualTextEntry } from './keyboard-shortcuts/isActualTextEntry';
import { handleDawClipboardShortcuts } from './keyboard-shortcuts/handleDawClipboardShortcuts';
import { handleNavigationShortcuts } from './keyboard-shortcuts/handleNavigationShortcuts';

export function useGlobalKeyboardShortcuts() {
  const audio = useAudio();
  const sequencer = useSequencer();

  const { handleTogglePlay, handleTimelineNavigate, seekToMeasure } = audio;
  const { handleUndo, handleRedo, setIsLooping } = sequencer;

  // InputManager Keyboard Listeners (Live Erase, etc.)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((window as any).oGiradorDetailEditorOpen) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (inputManager) inputManager.handleKeyDown(e);
    };
    const handleGlobalKeyUp = (e: KeyboardEvent) => {
      if ((window as any).oGiradorDetailEditorOpen) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (inputManager) inputManager.handleKeyUp(e);
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('keyup', handleGlobalKeyUp);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('keyup', handleGlobalKeyUp);
    };
  }, []);

  // Écouteur principal unifié avec les 3 barrières anti-conflits DAW
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const activeEl = document.activeElement as HTMLElement | null;
      const target = e.target as HTMLElement | null;
      const isInput = isActualTextEntry(target) || isActualTextEntry(activeEl);

      // BARRIÈRE 1 : Saisie de texte
      if (isInput) {
        if (e.key === 'Escape') {
          e.preventDefault();
          activeEl?.blur();
          target?.blur();
          return;
        }
        const isModifier = e.ctrlKey || e.metaKey;
        if (isModifier && (target?.classList.contains('step-input-cell') || activeEl?.classList.contains('step-input-cell'))) {
          const key = e.key.toLowerCase();
          if (!['z', 'y', 'a', 'x', 'c', 'v', 'd'].includes(key)) return;
        } else {
          return;
        }
      }

      // BARRIÈRE 2 : Modales & Pop-ups actives (Escape)
      if (e.key === 'Escape') {
        e.preventDefault();
        if (typeof (window as any).oGiradorDetailEditorClose === 'function') {
          (window as any).oGiradorDetailEditorClose();
          return;
        }
        if (useSequencerSettingsStore.getState().isSettingsOpen) {
          useSequencerSettingsStore.getState().setIsSettingsOpen(false);
          return;
        }
        useSequencerStore.getState().clearTimelineSelection();
        useSequencerStore.getState().clearAutomationSelection();
        window.dispatchEvent(new CustomEvent('close-popups'));
        return;
      }

      // BARRIÈRE 3 : Navigation & Transport
      if (handleNavigationShortcuts({ e, seekToMeasure, handleTimelineNavigate, setIsLooping })) return;

      const isTimelineView = (typeof window !== 'undefined' ? (window as any).__OGIRADOR_VIEW_MODE__ : '') === 'timeline';

      // Duplication Ctrl+D / Cmd+D (réservé Timeline)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (!isTimelineView || isActualTextEntry(document.activeElement as HTMLElement | null)) return;
        const store = useSequencerStore.getState();
        if (store.selectedTimelineCells && store.selectedTimelineCells.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          store.duplicateSelectedCells();
          return;
        }
        const activeCell = store.activeTimelineCell;
        if (activeCell) {
          e.preventDefault();
          e.stopPropagation();
          store.duplicateMeasurePattern(activeCell.trackId, activeCell.measureIdx, activeCell.measureIdx + 1);
          store.setActiveTimelineCell({ trackId: activeCell.trackId, measureIdx: activeCell.measureIdx + 1 });
        }
        return;
      }

      // Touche Suppr / Delete / Backspace : vider sélection timeline (réservé Timeline)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!isTimelineView || isActualTextEntry(document.activeElement as HTMLElement | null)) return;
        if (!(window as any).oGiradorDetailEditorOpen) {
          const store = useSequencerStore.getState();
          if (store.selectedTimelineCells.length > 0 || store.activeTimelineCell) {
            e.preventDefault();
            e.stopPropagation();
            store.deleteSelectedTimelineCells();
            return;
          }
        }
      }

      // Pressepapiers & Éléments DAW (Ctrl/Cmd) : restreint à la timeline, ou Undo/Redo global
      if (isTimelineView) {
        handleDawClipboardShortcuts({ e, handleUndo, handleRedo });
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault(); handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault(); handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleTimelineNavigate, seekToMeasure, handleUndo, handleRedo, setIsLooping]);
}
