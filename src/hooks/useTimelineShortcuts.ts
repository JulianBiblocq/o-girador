/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { useAudio } from '../contexts/AudioContext';
import { useSequencer } from '../contexts/SequencerContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../stores/useSequencerSettingsStore';

interface UseTimelineShortcutsOptions {
  onToggleViewMode?: () => void;
  onCloseEditor?: () => void;
}

/**
 * useTimelineShortcuts
 * Hook universel de raccourcis DAW & Timeline conforme aux standards de performance :
 * - Barrière 1 : Saisie de texte (INPUT, TEXTAREA, isContentEditable) -> seule Escape fait un blur().
 * - Barrière 2 : Modales & Pop-ups actives -> Escape ferme l'éditeur ou les pop-ups.
 * - Barrière 3 : Commandes de transport & navigation (Espace, Entrée/Home, Tab, O, L, < / >, Ctrl+D, Ctrl+Z/Y).
 * - Zero Render Thrashing : inspection directe de document.activeElement, aucun state React haute fréquence.
 */
export function useTimelineShortcuts(options?: UseTimelineShortcutsOptions) {
  const audio = useAudio();
  const sequencer = useSequencer();

  const { handleTogglePlay, handleTimelineNavigate } = audio;
  const { handleUndo, handleRedo, isLooping, setIsLooping } = sequencer;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const target = e.target as HTMLElement | null;

      const isTextEntry = 
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.isContentEditable ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        Boolean(target?.isContentEditable);

      // ─────────────────────────────────────────────────────────────
      // BARRIÈRE 1 : Saisie de texte
      // ─────────────────────────────────────────────────────────────
      if (isTextEntry) {
        // Seule la touche Escape est traitée pour dé-focaliser
        if (e.key === 'Escape') {
          e.preventDefault();
          activeEl?.blur();
          target?.blur();
        }
        return;
      }

      // ─────────────────────────────────────────────────────────────
      // BARRIÈRE 2 : Modales & Pop-ups actives (Escape)
      // ─────────────────────────────────────────────────────────────
      if (e.key === 'Escape') {
        e.preventDefault();

        // 1. Fermer l'éditeur d'instrument si ouvert
        if (typeof (window as any).oGiradorDetailEditorClose === 'function') {
          (window as any).oGiradorDetailEditorClose();
          return;
        }
        if (optionsRef.current?.onCloseEditor) {
          optionsRef.current.onCloseEditor();
          return;
        }

        // 2. Fermer A Oficina si ouverte
        if (useSequencerSettingsStore.getState().isSettingsOpen) {
          useSequencerSettingsStore.getState().setIsSettingsOpen(false);
          return;
        }

        // 3. Fermer les sélecteurs contextuels / popups
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

      // 2. Tab : Bascule Roda ↔ Timeline avec neutralisation stricte du focus traversal
      if (e.key === 'Tab') {
        e.preventDefault();
        if (optionsRef.current?.onToggleViewMode) {
          optionsRef.current.onToggleViewMode();
        } else {
          window.dispatchEvent(new CustomEvent('toggle-view-mode'));
        }
        return;
      }

      // 3. Entrée ou Home : Remettre la tête de lecture au début (mesure 1)
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
        if (setIsLooping) {
          setIsLooping(nextLoop);
        }
        return;
      }

      // 6. < / , et > / . : Reculer ou avancer d'une mesure entière
      if (e.key === '<' || e.key === ',' || e.key === '>' || e.key === '.') {
        e.preventDefault();
        const curM = useSequencerStore.getState().currentMeasure;
        const totalM = useSequencerStore.getState().totalMeasures;
        if (e.key === '<' || e.key === ',') {
          const prevIdx = Math.max(0, curM - 1);
          handleTimelineNavigate(prevIdx, 0, 16);
        } else {
          const nextIdx = Math.min(totalM - 1, curM + 1);
          handleTimelineNavigate(nextIdx, 0, 16);
        }
        return;
      }

      // 7. Ctrl+D / Cmd+D : Dupliquer le motif de la mesure active vers la mesure suivante (m+1)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        const activeCell = useSequencerStore.getState().activeTimelineCell;
        if (activeCell) {
          e.preventDefault();
          e.stopPropagation();
          useSequencerStore.getState().duplicateMeasurePattern(
            activeCell.trackId,
            activeCell.measureIdx,
            activeCell.measureIdx + 1
          );
          useSequencerStore.getState().setActiveTimelineCell({
            trackId: activeCell.trackId,
            measureIdx: activeCell.measureIdx + 1,
          });
        }
        return;
      }

      // 8. Ctrl+Z / Ctrl+Shift+Z ou Ctrl+Y : Annuler / Rétablir
      const isUndoKey = (e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && !e.shiftKey;
      const isRedoKey = 
        ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
        ((e.key === 'y' || e.key === 'Y') && (e.ctrlKey || e.metaKey));

      if (isUndoKey) {
        e.preventDefault();
        if (handleUndo) handleUndo();
        return;
      } else if (isRedoKey) {
        e.preventDefault();
        if (handleRedo) handleRedo();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleTimelineNavigate, handleUndo, handleRedo, setIsLooping]);
}
