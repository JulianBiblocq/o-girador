import { useEffect, useRef } from 'react';
import { isEditableTarget } from '../utils/crossRealmDom';
import { tryHandleRodaStepExploreKeyDown } from './keyboard-shortcuts/rodaStepExploreGuard';

/**
 * useGlobalTransportShortcuts
 *
 * Verrouillage global et prioritaire ({ capture: true }) des raccourcis transport DAW :
 * - Espace -> Play / Pause
 * - Shift + Espace -> Stop (repos 12h sur mesure courante)
 * - Home -> Retour au début (1er appui : début de boucle de section, 2e appui : Mesure 1)
 * - ← / → (sur la Roda en Pause ou Stop) -> Exploration pas-à-pas avec son, balai +180° et Ao Vivo
 * - Barrière 1 stricte : sanctuarise INPUT texte, TEXTAREA, isContentEditable, .v-syl
 * - Dé-focalisation défensive (.blur()) sur <button> et <input type="range">
 */
export function useGlobalTransportShortcuts(
  togglePlay: () => void,
  stop?: () => void,
  rewind?: () => void,
  stepExploreRoda?: (direction: 'next' | 'prev') => void
) {
  const togglePlayRef = useRef(togglePlay);
  togglePlayRef.current = togglePlay;
  const stopRef = useRef(stop);
  stopRef.current = stop;
  const rewindRef = useRef(rewind);
  rewindRef.current = rewind;
  const stepExploreRef = useRef(stepExploreRoda);
  stepExploreRef.current = stepExploreRoda;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        tryHandleRodaStepExploreKeyDown(e, stepExploreRef.current, { hostDoc: document, isSatelliteWindow: false });
        return;
      }

      const isSpace = e.code === 'Space' || e.key === ' ';
      const isHome = e.key === 'Home';
      if (!isSpace && !isHome) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isHome && e.shiftKey) return;

      const target = e.target as HTMLElement | null;
      const activeEl = document.activeElement as HTMLElement | null;
      const isTargetInput = isEditableTarget(target);
      const isFocusedInput = isEditableTarget(activeEl) || activeEl?.id === 'letras-textarea';
      if (isTargetInput || isFocusedInput) return;

      e.preventDefault();
      e.stopPropagation();

      if (activeEl && typeof activeEl.blur === 'function') activeEl.blur();
      if (target && typeof target.blur === 'function') target.blur();

      if (isHome) {
        rewindRef.current?.();
        return;
      }

      if (e.shiftKey) {
        if (stopRef.current) stopRef.current();
        else togglePlayRef.current?.();
      } else {
        togglePlayRef.current?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);
}
