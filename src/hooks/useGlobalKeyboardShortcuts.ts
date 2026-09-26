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

export function useGlobalKeyboardShortcuts() {
  const audio = useAudio();
  const sequencer = useSequencer();

  const { handleTogglePlay, handleTimelineNavigate } = audio;
  const { handleUndo, handleRedo, setIsLooping } = sequencer;

  // InputManager Keyboard Listeners (Live Erase, etc.)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((window as any).oGiradorDetailEditorOpen) return;
      if (inputManager) inputManager.handleKeyDown(e);
    };
    const handleGlobalKeyUp = (e: KeyboardEvent) => {
      if ((window as any).oGiradorDetailEditorOpen) return;
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
      const activeEl = document.activeElement as HTMLElement | null;
      const target = e.target as HTMLElement | null;

      const isTargetInput = target instanceof HTMLInputElement || 
                            target instanceof HTMLTextAreaElement || 
                            target instanceof HTMLSelectElement || 
                            Boolean(target?.isContentEditable);

      const isFocusedInput = activeEl?.tagName === 'INPUT' ||
                             activeEl?.tagName === 'SELECT' ||
                             activeEl?.tagName === 'TEXTAREA' ||
                             activeEl?.id === 'letras-textarea' ||
                             Boolean(activeEl?.isContentEditable);

      const isInput = isTargetInput || isFocusedInput;

      // ─────────────────────────────────────────────────────────────
      // BARRIÈRE 1 : Saisie de texte
      // ─────────────────────────────────────────────────────────────
      if (isInput) {
        // Seule la touche Escape dé-focalise le champ actif
        if (e.key === 'Escape') {
          e.preventDefault();
          activeEl?.blur();
          target?.blur();
          return;
        }

        // Exception autorisée : Copier/Coller/Sélectionner sur une cellule de grille
        const isModifier = e.ctrlKey || e.metaKey;
        if (isModifier && (target?.classList.contains('step-input-cell') || activeEl?.classList.contains('step-input-cell'))) {
          const key = e.key.toLowerCase();
          if (['z', 'y', 'a', 'x', 'c', 'v', 'd'].includes(key)) {
            // Laisser passer vers la logique ci-dessous
          } else {
            return;
          }
        } else {
          return;
        }
      }

      // ─────────────────────────────────────────────────────────────
      // BARRIÈRE 2 : Modales & Pop-ups actives (Escape)
      // ─────────────────────────────────────────────────────────────
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
        window.dispatchEvent(new CustomEvent('close-popups'));
        return;
      }

      // ─────────────────────────────────────────────────────────────
      // BARRIÈRE 3 : Commandes de Transport & Vues
      // ─────────────────────────────────────────────────────────────

      // 1. Espace : Transport Play / Pause exclusivement
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
        return;
      }

      // 2. Tab : Bascule Roda ↔ Timeline (avec neutralisation native du focus)
      if (e.key === 'Tab') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('toggle-view-mode'));
        return;
      }

      // 3. Entrée ou Home : Remettre la tête de lecture au début
      if (e.key === 'Enter' || e.key === 'Home') {
        e.preventDefault();
        if (handleTimelineNavigate) {
          handleTimelineNavigate(0, 0, 16);
        }
        return;
      }

      // 4. O : Ouvrir / Fermer A Oficina
      if (e.key.toLowerCase() === 'o' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        useSequencerSettingsStore.getState().toggleSettings();
        return;
      }

      // 5. L : Activer / Désactiver la boucle
      if (e.key.toLowerCase() === 'l' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const nextLoop = !useSequencerStore.getState().isLooping;
        useSequencerStore.getState().setIsLooping(nextLoop);
        if (setIsLooping) setIsLooping(nextLoop);
        return;
      }

      // 6. < / , et > / . : Reculer ou avancer d'une mesure entière
      if (e.key === '<' || e.key === ',' || e.key === '>' || e.key === '.') {
        e.preventDefault();
        const curM = useSequencerStore.getState().currentMeasure;
        const totalM = useSequencerStore.getState().totalMeasures;
        if (e.key === '<' || e.key === ',') {
          const prevIdx = Math.max(0, curM - 1);
          if (handleTimelineNavigate) handleTimelineNavigate(prevIdx, 0, 16);
        } else {
          const nextIdx = Math.min(totalM - 1, curM + 1);
          if (handleTimelineNavigate) handleTimelineNavigate(nextIdx, 0, 16);
        }
        return;
      }

      // 7. Ctrl+D / Cmd+D : Dupliquer la sélection multiple OU la mesure active vers m+1
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        const curActive = document.activeElement as HTMLElement | null;
        if (
          curActive?.tagName === 'INPUT' ||
          curActive?.tagName === 'TEXTAREA' ||
          curActive?.isContentEditable ||
          isInput
        ) {
          return;
        }

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
          store.duplicateMeasurePattern(
            activeCell.trackId,
            activeCell.measureIdx,
            activeCell.measureIdx + 1
          );
          store.setActiveTimelineCell({
            trackId: activeCell.trackId,
            measureIdx: activeCell.measureIdx + 1,
          });
        }
        return;
      }

      // 8. Modificateurs : Undo, Redo, Copy, Cut, Paste, Select All
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            if (handleRedo) handleRedo();
          } else {
            if (handleUndo) handleUndo();
          }
          return;
        }
        if (key === 'y') {
          e.preventDefault();
          if (handleRedo) handleRedo();
          return;
        }
        if (['a', 'x', 'c', 'v', 'd'].includes(key)) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('grid-shortcut', { detail: { key } }));
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleTimelineNavigate, handleUndo, handleRedo, setIsLooping]);
}
