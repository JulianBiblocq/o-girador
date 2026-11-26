import { subscribeToTick, unsubscribeFromTick } from '../../hooks/useAudioSync';
import { frozenPlaybackState } from '../../hooks/audio-sync/frozenPlaybackState';
import { subscribeToVisualFrame, unsubscribeFromVisualFrame } from '../../audio/visualTickBuffer';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';

export interface RodaIdleDirtyCallbacks {
  paintRodaFrame: (ctxTime: number) => void;
  scheduleIdleRedraw: () => void;
  invalidateAndRedraw: () => void;
}

export function hasRodaVisibilityChanged(next: any, prev: any): boolean {
  if (!prev || next === prev) return false;
  if (
    next.rodaTrackOrder !== prev.rodaTrackOrder ||
    next.showLinkedTracksOnRoda !== prev.showLinkedTracksOnRoda ||
    next.isFocusActive !== prev.isFocusActive ||
    next.focusTrackId !== prev.focusTrackId ||
    next.referenceTrackId !== prev.referenceTrackId
  ) {
    return true;
  }
  const a = next.tracks || [], b = prev.tracks || [];
  if (a === b) return false;
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].id !== b[i].id ||
      Boolean(a[i].isHidden) !== Boolean(b[i].isHidden) ||
      Boolean(a[i].isMute) !== Boolean(b[i].isMute) ||
      Boolean(a[i].isSolo) !== Boolean(b[i].isSolo)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Attache l'ensemble exhaustif des sources d'invalidation (`dirty flag`) garantissant qu'au repos (`0 FPS`),
 * en Pause (`frozenPlaybackState.active`) comme en lecture, tout clic sur l'Œil / Mute / Solo invalide les caches
 * et redessine la Roda en moins d'une trame.
 */
export function attachRodaIdleDirtyListeners(
  canvas: HTMLCanvasElement,
  cbs: RodaIdleDirtyCallbacks
): () => void {
  const { paintRodaFrame, scheduleIdleRedraw, invalidateAndRedraw } = cbs;

  const onTick = () => {
    if (!useSequencerStore.getState().isPlaying || frozenPlaybackState.active) invalidateAndRedraw();
  };
  const unsubSeq = useSequencerStore.subscribe((state, prevState) => {
    if (!state.isPlaying || frozenPlaybackState.active || hasRodaVisibilityChanged(state, prevState)) {
      invalidateAndRedraw();
    }
  });
  const unsubTr = useTransportStore.subscribe((tr, prevTr) => {
    if (
      !useSequencerStore.getState().isPlaying ||
      tr.soloPatternPlayId !== prevTr.soloPatternPlayId ||
      tr.soloPatternVariationId !== prevTr.soloPatternVariationId ||
      tr.isPaused !== prevTr.isPaused ||
      tr.isVisualMetronomeActive !== prevTr.isVisualMetronomeActive
    ) {
      invalidateAndRedraw();
    }
  });

  subscribeToVisualFrame(paintRodaFrame);
  subscribeToTick(onTick);

  const parentEl = canvas.parentElement;
  const ro = typeof ResizeObserver !== 'undefined' && parentEl
    ? new ResizeObserver(() => invalidateAndRedraw())
    : null;
  ro?.observe(parentEl!);

  if (typeof window !== 'undefined') window.addEventListener('resize', invalidateAndRedraw);
  const onFontsDone = () => invalidateAndRedraw();
  if (typeof document !== 'undefined') {
    document.fonts?.ready?.then(onFontsDone).catch(() => {});
    document.fonts?.addEventListener?.('loadingdone', onFontsDone);
  }

  return () => {
    unsubscribeFromVisualFrame(paintRodaFrame);
    unsubscribeFromTick(onTick);
    unsubSeq();
    unsubTr();
    ro?.disconnect();
    if (typeof window !== 'undefined') window.removeEventListener('resize', invalidateAndRedraw);
    if (typeof document !== 'undefined') document.fonts?.removeEventListener?.('loadingdone', onFontsDone);
    void scheduleIdleRedraw;
  };
}
