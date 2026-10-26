/**
 * O Girador - Centralized VU-Meter rAF Ticker & Performance Gate (< 80 lines)
 */
import { useSequencerStore } from '../../stores/useSequencerStore';

export function isDetailEditorOpen(): boolean {
  return useSequencerStore.getState().editingTrackId !== null;
}

const subscribers = new Set<() => void>();
let rafId: number | null = null;

function tick() {
  if (subscribers.size === 0) {
    rafId = null;
    return;
  }

  const state = useSequencerStore.getState();
  const isSuspended = state.editingTrackId !== null || state.isEcoMode;

  if (!isSuspended) {
    subscribers.forEach((cb) => {
      try {
        cb();
      } catch (_) {}
    });
  }

  rafId = requestAnimationFrame(tick);
}

export function subscribeVuMeter(callback: () => void): () => void {
  subscribers.add(callback);
  if (rafId === null) {
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
