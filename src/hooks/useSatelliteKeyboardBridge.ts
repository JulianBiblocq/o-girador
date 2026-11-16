/**
 * useSatelliteKeyboardBridge.ts — Pont clavier DAW (Transport, Undo/Redo, Escape) pour la Fenêtre Satellite (< 105 lignes).
 * N'utilise jamais `instanceof` (duck-typing inter-royaumes entre `window` et `satelliteWindow`).
 */
import { useEffect, useRef } from 'react';
import { useAudio } from '../contexts/AudioContext';
import { useSequencer } from '../contexts/SequencerContext';
import { useWindow } from '../contexts/WindowContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { isEditableTarget } from '../utils/crossRealmDom';
import { isActualTextEntry } from './keyboard-shortcuts/isActualTextEntry';

export function useSatelliteKeyboardBridge() {
  const hostWin = useWindow();
  const { handleTogglePlay, seekToMeasure } = useAudio();
  const { handleUndo, handleRedo, setIsLooping } = useSequencer();

  const actionsRef = useRef({ handleTogglePlay, seekToMeasure, handleUndo, handleRedo, setIsLooping });
  actionsRef.current = { handleTogglePlay, seekToMeasure, handleUndo, handleRedo, setIsLooping };

  useEffect(() => {
    if (!hostWin || hostWin === window || !hostWin.addEventListener) return;
    const hostDoc = hostWin.document;

    // 1. Capture : Espace -> Play / Stop (sauf saisie texte ou photomaton actif)
    const onCaptureKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (hostDoc.querySelector('[data-photobooth-capture="true"]')) return;

      const target = e.target as HTMLElement | null;
      const activeEl = hostDoc.activeElement as HTMLElement | null;
      if (isEditableTarget(target) || isEditableTarget(activeEl) || activeEl?.id === 'letras-textarea') {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      activeEl?.blur?.();
      target?.blur?.();
      actionsRef.current.handleTogglePlay();
    };

    // 2. Bubble : Undo / Redo, Boucle [L], Retour début [Home], Escape défensif (sans fermer la fenêtre)
    const onBubbleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      const activeEl = hostDoc.activeElement as HTMLElement | null;
      const isText = isActualTextEntry(target) || isActualTextEntry(activeEl);

      if (e.key === 'Escape') {
        if (hostDoc.querySelector('[data-testid="custom-dialog-backdrop"], [role="menu"], #touch-stroke-selector-bubble')) {
          return;
        }
        if (isEditableTarget(activeEl) || isEditableTarget(target)) {
          e.preventDefault();
          activeEl?.blur?.();
          target?.blur?.();
        }
        return;
      }

      const isMod = e.ctrlKey || e.metaKey;
      if (isMod) {
        const isStepCell = Boolean(target?.classList?.contains('step-input-cell') || activeEl?.classList?.contains('step-input-cell'));
        if (isText && !isStepCell) return;
        const key = e.key.toLowerCase();
        if (key === 'z' && !e.shiftKey) {
          e.preventDefault();
          actionsRef.current.handleUndo();
          return;
        }
        if (key === 'y' || (key === 'z' && e.shiftKey)) {
          e.preventDefault();
          actionsRef.current.handleRedo();
          return;
        }
        return;
      }

      if (isText || isEditableTarget(target) || isEditableTarget(activeEl)) return;

      if (e.key === 'Home') {
        e.preventDefault();
        actionsRef.current.seekToMeasure?.(0, 0);
      } else if (e.key.toLowerCase() === 'l' && !e.altKey) {
        e.preventDefault();
        const nextLoop = !useSequencerStore.getState().isLooping;
        useSequencerStore.getState().setIsLooping(nextLoop);
        actionsRef.current.setIsLooping?.(nextLoop);
      }
    };

    hostWin.addEventListener('keydown', onCaptureKeyDown, { capture: true });
    hostWin.addEventListener('keydown', onBubbleKeyDown);
    return () => {
      hostWin.removeEventListener('keydown', onCaptureKeyDown, { capture: true });
      hostWin.removeEventListener('keydown', onBubbleKeyDown);
    };
  }, [hostWin]);
}
