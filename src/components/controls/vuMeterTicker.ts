/**
 * O Girador - Centralized VU-Meter rAF Ticker & Zero-RAF Eco Suspension Gate (< 95 lines)
 * Suspendu en Palier 1 Eco ou quand l'editeur detaille est ouvert. A l'entree en suspension,
 * chaque abonne recoit UNE SEULE fois son callback de remise a zero, puis la boucle rAF est
 * totalement coupee (`rafId = null`) jusqu'a la levee de la suspension.
 */
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useDesktopWorkspaceStore } from '../../stores/useDesktopWorkspaceStore';

export function isDetailEditorOpen(): boolean {
  const ws = useDesktopWorkspaceStore.getState();
  if (ws.isSatelliteOpen && ws.satelliteMode === 'editor') return false;
  return useSequencerStore.getState().editingTrackId !== null;
}

export function isVuMeterSuspended(): boolean {
  const state = useSequencerStore.getState();
  const isSatelliteOpen = useDesktopWorkspaceStore.getState().isSatelliteOpen;
  return Boolean(state.isEcoMode) || (state.editingTrackId !== null && !isSatelliteOpen);
}

const subscribers = new Map<() => void, (() => void) | undefined>();
let rafId: number | null = null;
let wasSuspended = false;
let storeListenersAttached = false;

function flushSuspendCallbacksOnce(): void {
  if (wasSuspended) return;
  wasSuspended = true;
  subscribers.forEach((onSuspend) => {
    try { onSuspend?.(); } catch (err) { console.error('[VuMeterTicker] reset failed:', err); }
  });
}

function stopRafLoop(): void {
  if (rafId !== null && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(rafId);
  }
  rafId = null;
}

function scheduleRafLoop(): void {
  if (rafId !== null || subscribers.size === 0) return;
  if (typeof requestAnimationFrame === 'function') {
    rafId = requestAnimationFrame(tick);
  }
}

function handleSuspensionStateChange(): void {
  if (subscribers.size === 0) return;
  if (isVuMeterSuspended()) {
    flushSuspendCallbacksOnce();
    stopRafLoop();
  } else if (wasSuspended) {
    wasSuspended = false;
    scheduleRafLoop();
  }
}

function ensureStoreSubscription(): void {
  if (storeListenersAttached) return;
  storeListenersAttached = true;
  useSequencerStore.subscribe(handleSuspensionStateChange);
  useDesktopWorkspaceStore.subscribe(handleSuspensionStateChange);
}

function tick(): void {
  rafId = null;
  if (subscribers.size === 0) return;

  if (isVuMeterSuspended()) {
    flushSuspendCallbacksOnce();
    return;
  }

  wasSuspended = false;
  subscribers.forEach((_, cb) => {
    try { cb(); } catch (err) { console.error('[VuMeterTicker] update failed:', err); }
  });

  scheduleRafLoop();
}

export function subscribeVuMeter(callback: () => void, onSuspend?: () => void): () => void {
  ensureStoreSubscription();
  subscribers.set(callback, onSuspend);

  if (isVuMeterSuspended()) {
    wasSuspended = true;
    try { onSuspend?.(); } catch (err) { console.error('[VuMeterTicker] initial reset failed:', err); }
    stopRafLoop();
  } else {
    wasSuspended = false;
    scheduleRafLoop();
  }

  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0) {
      stopRafLoop();
      wasSuspended = false;
    }
  };
}

export function getVuMeterTickerDebugState(): { subscriberCount: number; isRafRunning: boolean; wasSuspended: boolean } {
  return { subscriberCount: subscribers.size, isRafRunning: rafId !== null, wasSuspended };
}
