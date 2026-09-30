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

  const { handleTogglePlay, handleTimelineNavigate, seekToMeasure } = audio;
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
      if (e.defaultPrevented) return;
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
        useSequencerStore.getState().clearAutomationSelection();
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

      // 3. Entrée ou Home : Remettre la tête de lecture au début absolu (Mesure 0, Temps 1)
      if (e.key === 'Enter' || e.key === 'Home') {
        const curActive = document.activeElement as HTMLElement | null;
        if (
          curActive?.tagName === 'INPUT' ||
          curActive?.tagName === 'TEXTAREA' ||
          curActive?.isContentEditable ||
          isInput
        ) {
          return;
        }

        e.preventDefault();
        if (seekToMeasure) {
          seekToMeasure(0, 0);
        } else if (handleTimelineNavigate) {
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

      // 6. Navigation par Mesures au Clavier (ArrowLeft / ArrowRight)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const curActive = document.activeElement as HTMLElement | null;
        if (
          curActive?.tagName === 'INPUT' ||
          curActive?.tagName === 'TEXTAREA' ||
          curActive?.isContentEditable ||
          isInput
        ) {
          return;
        }

        e.preventDefault();
        const curM = useSequencerStore.getState().currentMeasure;
        const totalM = useSequencerStore.getState().totalMeasures;
        const delta = e.shiftKey ? 4 : 1;

        const targetM = e.key === 'ArrowLeft'
          ? Math.max(0, curM - delta)
          : Math.min(totalM - 1, curM + delta);

        if (seekToMeasure) {
          seekToMeasure(targetM, 0);
        } else if (handleTimelineNavigate) {
          handleTimelineNavigate(targetM, 0, 16);
        }
        return;
      }

      // 6.5. Touches complémentaires DAW : < / , / NumpadSubtract / - et > / . / NumpadAdd / +
      const isPrevMeasureKey = e.key === '<' || e.key === ',' || e.code === 'NumpadSubtract' || (e.key === '-' && !e.ctrlKey && !e.metaKey);
      const isNextMeasureKey = e.key === '>' || e.key === '.' || e.code === 'NumpadAdd' || (e.key === '+' && !e.ctrlKey && !e.metaKey);

      if (isPrevMeasureKey || isNextMeasureKey) {
        const curActive = document.activeElement as HTMLElement | null;
        if (
          curActive?.tagName === 'INPUT' ||
          curActive?.tagName === 'TEXTAREA' ||
          curActive?.isContentEditable ||
          isInput
        ) {
          return;
        }

        e.preventDefault();
        const curM = useSequencerStore.getState().currentMeasure;
        const totalM = useSequencerStore.getState().totalMeasures;
        const targetM = isPrevMeasureKey
          ? Math.max(0, curM - 1)
          : Math.min(totalM - 1, curM + 1);

        if (seekToMeasure) {
          seekToMeasure(targetM, 0);
        } else if (handleTimelineNavigate) {
          handleTimelineNavigate(targetM, 0, 16);
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

      // 7.5. Touche Suppr / Delete / Backspace : Vider la sélection timeline (passer en silence)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const curActive = document.activeElement as HTMLElement | null;
        if (
          curActive?.tagName === 'INPUT' ||
          curActive?.tagName === 'TEXTAREA' ||
          curActive?.isContentEditable ||
          isInput
        ) {
          return;
        }

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

      // 8. Modificateurs : Undo, Redo, Copy, Cut, Paste, Select All
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            useSequencerStore.getState().handleRedo();
            if (handleRedo) handleRedo();
          } else {
            useSequencerStore.getState().handleUndo();
            if (handleUndo) handleUndo();
          }
          return;
        }
        if (key === 'y') {
          e.preventDefault();
          useSequencerStore.getState().handleRedo();
          if (handleRedo) handleRedo();
          return;
        }
        if (['c', 'x', 'v'].includes(key)) {
          const store = useSequencerStore.getState();
          const hasTimelineTarget = Boolean(
            store.activeTimelineCell || (store.selectedTimelineCells && store.selectedTimelineCells.length > 0)
          );
          if (hasTimelineTarget) {
            e.preventDefault();
            e.stopPropagation();
            if (key === 'c') {
              store.copyTimelineSelection();
            } else if (key === 'x') {
              store.cutTimelineSelection();
            } else if (key === 'v') {
              if (store.timelineClipboard && store.activeTimelineCell) {
                store.pasteTimelineClipboard();
              }
            }
            return;
          }
        }
        if (key === 'a') {
          const curActive = document.activeElement as HTMLElement | null;
          if (
            curActive?.tagName === 'INPUT' ||
            curActive?.tagName === 'TEXTAREA' ||
            curActive?.isContentEditable ||
            isInput
          ) {
            return;
          }

          if (!(window as any).oGiradorDetailEditorOpen) {
            e.preventDefault();
            e.stopPropagation();
            useSequencerStore.getState().selectAllTimelineCells();
            return;
          }
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
  }, [handleTogglePlay, handleTimelineNavigate, seekToMeasure, handleUndo, handleRedo, setIsLooping]);
}
