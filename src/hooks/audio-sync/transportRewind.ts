/**
 * Commande [ ⏮ Retour au début ] (Home / Entrée) active en LECTURE, en PAUSE et à l'ARRÊT (< 95 lignes).
 * - Avec boucle de section active (`isLoopRegionActive && loopStartMeasure > 0`) :
 *   * 1er clic : saute au Temps 1 de `loopStartMeasure` (relance immédiate en lecture, 12h au repos en pause/arrêt).
 *   * 2e clic (si déjà à 12h sur `loopStartMeasure` à l'arrêt, ou double-clic < 350 ms en lecture) : Temps 1 de la Mesure 1 (`0`).
 * - Sans boucle partielle : Temps 1 de la Mesure 1 (`measure = 0, step = 0`).
 */

import { getExpandedMeasures } from '../../utils/measureHelpers';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { clearFreeze, frozenPlaybackState } from './frozenPlaybackState';
import { seekToMeasure } from './transportNavigation';
import type { NavigationContext } from './transportNavigationTypes';

const DOUBLE_REWIND_WINDOW_MS = 350;
let lastRewindClickAtMs = 0;
let lastRewindTargetMeasure = -1;

export function resetRewindDoubleClickHistory(): void {
  lastRewindClickAtMs = 0;
  lastRewindTargetMeasure = -1;
}

export function executeTransportRewind(ctx: NavigationContext): void {
  const store = useSequencerStore.getState();
  const totalM = Math.max(1, ctx.totalMeasuresRef.current || store.totalMeasures || 1);
  const isLoopActive = Boolean(ctx.isLoopRegionActiveRef?.current ?? store.isLoopRegionActive);
  const rawLoopStart = ctx.loopStartRef?.current ?? store.loopStartMeasure;
  const loopStart = rawLoopStart !== null && rawLoopStart !== undefined
    ? Math.max(0, Math.min(totalM - 1, rawLoopStart))
    : 0;
  const hasPartialLoopStart = isLoopActive && loopStart > 0;

  const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const isPlaying = Boolean(ctx.isPlayingRef.current);
  const isPaused = Boolean(useTransportStore.getState().isPaused || frozenPlaybackState.active);

  let targetM = 0;

  if (hasPartialLoopStart) {
    if (isPlaying) {
      const isDoubleClick =
        nowMs - lastRewindClickAtMs < DOUBLE_REWIND_WINDOW_MS &&
        lastRewindTargetMeasure === loopStart;
      targetM = isDoubleClick ? 0 : loopStart;
    } else if (isPaused) {
      // En pause (aiguille figée), le 1er clic ramène au repos à 12h sur loopStartMeasure
      targetM = loopStart;
    } else {
      // Déjà à l'arrêt complet au repos (12h) : si déjà sur loopStartMeasure, 2e clic -> Mesure 1 (0)
      const currentRestM = store.currentMeasure ?? ctx.measureCountRef.current ?? 0;
      targetM = currentRestM === loopStart ? 0 : loopStart;
    }
  }

  lastRewindClickAtMs = nowMs;
  lastRewindTargetMeasure = targetM;

  clearFreeze();
  useTransportStore.getState().setIsPaused(false);
  store.setCurrentLoopIteration(1);
  store.clearLoopExitRequest();

  seekToMeasure(targetM, 0, undefined, ctx);

  const expanded = getExpandedMeasures(totalM, store.songSections);
  const expIdx = expanded.findIndex((item) => item.baseMeasure === targetM);
  store.setCurrentExpandedMeasureIdx(expIdx !== -1 ? expIdx : targetM);

  if (!isPlaying && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('o-girador-playback-stopped'));
  }
}
