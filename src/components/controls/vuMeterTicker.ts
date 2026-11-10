/**
 * O Girador - Centralized VU-Meter rAF Ticker & Performance Gate (< 80 lines)
 * Suspendu en Palier 1 Eco ou quand l'editeur detaille est ouvert. A l'entree en suspension,
 * chaque abonne recoit UNE SEULE fois son callback de remise a zero (aucune jauge figee en plein pic).
 */
import { useSequencerStore } from '../../stores/useSequencerStore';

export function isDetailEditorOpen(): boolean {
  return useSequencerStore.getState().editingTrackId !== null;
}

const subscribers = new Map<() => void, (() => void) | undefined>();
let rafId: number | null = null;
let wasSuspended = false;

function tick() {
  if (subscribers.size === 0) {
    rafId = null;
    return;
  }

  const state = useSequencerStore.getState();
  const isSuspended = state.editingTrackId !== null || state.isEcoMode;

  if (isSuspended && !wasSuspended) {
    subscribers.forEach((onSuspend) => {
      try { onSuspend?.(); } catch (err) { console.error('[VuMeterTicker] reset failed:', err); }
    });
  }
  wasSuspended = isSuspended;

  if (!isSuspended) {
    subscribers.forEach((_, cb) => {
      try { cb(); } catch (err) { console.error('[VuMeterTicker] update failed:', err); }
    });
  }

  rafId = requestAnimationFrame(tick);
}

export function subscribeVuMeter(callback: () => void, onSuspend?: () => void): () => void {
  subscribers.set(callback, onSuspend);
  if (rafId === null) {
    wasSuspended = false;
    rafId = requestAnimationFrame(tick);
  }

  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0 && rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
}
