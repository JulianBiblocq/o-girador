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
/**
 * Vérifie si un élément HTML est un vrai champ de saisie textuelle actif.
 * Exclut explicitement les faders/sliders (<input type="range">), boutons, checkboxes, etc.
 */
function isActualTextEntry(el: HTMLElement | null): boolean {
  if (!el) return false;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) {
    const type = (el.type || 'text').toLowerCase();
    const textTypes = ['text', 'search', 'password', 'email', 'number', 'tel', 'url'];
    return textTypes.includes(type) && !el.readOnly && !el.disabled;
  }
  return false;
}

export function useTimelineShortcuts(options?: UseTimelineShortcutsOptions) {
  const audio = useAudio();
  const sequencer = useSequencer();

  const { handleTogglePlay, handleTimelineNavigate, seekToMeasure } = audio;
  const { handleUndo, handleRedo, isLooping, setIsLooping } = sequencer;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const activeEl = document.activeElement as HTMLElement | null;
      const target = e.target as HTMLElement | null;

      const isTextEntry = isActualTextEntry(target) || isActualTextEntry(activeEl);

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

        // 3. Vider la sélection multiple sur la timeline et l'automation
        useSequencerStore.getState().clearTimelineSelection();
        useSequencerStore.getState().clearAutomationSelection();

        // 4. Fermer les sélecteurs contextuels / popups
        window.dispatchEvent(new CustomEvent('close-popups'));
        return;
      }

      // ─────────────────────────────────────────────────────────────
      // BARRIÈRE 3 : Commandes de Transport & Vues
      // ─────────────────────────────────────────────────────────────

      // 1. Espace : Transport Play / Pause — Sanctuarisé au sommet par useGlobalTransportShortcuts (capture: true)

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

      // 3. Entrée ou Home : Remettre la tête de lecture au début absolu (Mesure 0, Temps 1)
      if (e.key === 'Enter' || e.key === 'Home') {
        if (isActualTextEntry(document.activeElement as HTMLElement | null)) {
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
        if (setIsLooping) {
          setIsLooping(nextLoop);
        }
        return;
      }

      // 6. Navigation par Mesures au Clavier (ArrowLeft / ArrowRight)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (isActualTextEntry(document.activeElement as HTMLElement | null)) {
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
        if (isActualTextEntry(document.activeElement as HTMLElement | null)) {
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

      // 7. Ctrl+D / Cmd+D : Dupliquer la sélection multiple OU le motif de la mesure active vers la mesure suivante (m+1)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (isActualTextEntry(document.activeElement as HTMLElement | null)) {
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

      // 7.5. Ctrl+C / Cmd+C : Copier la sélection timeline
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (isActualTextEntry(document.activeElement as HTMLElement | null)) {
          return;
        }

        const store = useSequencerStore.getState();
        if (store.activeTimelineCell || (store.selectedTimelineCells && store.selectedTimelineCells.length > 0)) {
          e.preventDefault();
          e.stopPropagation();
          store.copyTimelineSelection();
          return;
        }
      }

      // 7.6. Ctrl+X / Cmd+X : Couper la sélection timeline
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        if (isActualTextEntry(document.activeElement as HTMLElement | null)) {
          return;
        }

        const store = useSequencerStore.getState();
        if (store.activeTimelineCell || (store.selectedTimelineCells && store.selectedTimelineCells.length > 0)) {
          e.preventDefault();
          e.stopPropagation();
          store.cutTimelineSelection();
          return;
        }
      }

      // 7.7. Ctrl+V / Cmd+V : Coller le presse-papier timeline à la position active
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (isActualTextEntry(document.activeElement as HTMLElement | null)) {
          return;
        }

        const store = useSequencerStore.getState();

        // Si une section de morceau est copiée dans le presse-papier
        if (store.copiedSection) {
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
            return;
          }
        }

        // Sinon, coller le presse-papier de cellules de mesures
        if (store.timelineClipboard && store.activeTimelineCell) {
          e.preventDefault();
          e.stopPropagation();
          store.pasteTimelineClipboard();
          return;
        }
      }

      // 7.8. Touche Suppr / Delete / Backspace : Vider la sélection timeline (passer en silence)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (isActualTextEntry(document.activeElement as HTMLElement | null)) {
          return;
        }

        const store = useSequencerStore.getState();
        if (store.selectedTimelineCells.length > 0 || store.activeTimelineCell) {
          e.preventDefault();
          e.stopPropagation();
          store.deleteSelectedTimelineCells();
          return;
        }
      }

      // 7.9. Ctrl+A / Cmd+A : Tout sélectionner sur la timeline
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        if (isActualTextEntry(document.activeElement as HTMLElement | null)) {
          return;
        }

        if (!(window as any).oGiradorDetailEditorOpen) {
          e.preventDefault();
          e.stopPropagation();
          useSequencerStore.getState().selectAllTimelineCells();
          return;
        }
      }

      // 8. Ctrl+Z / Ctrl+Shift+Z ou Ctrl+Y : Annuler / Rétablir
      const isUndoKey = (e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && !e.shiftKey;
      const isRedoKey = 
        ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
        ((e.key === 'y' || e.key === 'Y') && (e.ctrlKey || e.metaKey));

      if (isUndoKey) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (handleUndo) {
          handleUndo();
        } else {
          useSequencerStore.getState().handleUndo();
        }
        return;
      } else if (isRedoKey) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (handleRedo) {
          handleRedo();
        } else {
          useSequencerStore.getState().handleRedo();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleTimelineNavigate, seekToMeasure, handleUndo, handleRedo, setIsLooping]);
}
