/**
 * satelliteWindowWatcher.ts — Surveillance debouncée des coordonnées & visibilité Écran 2 (< 115 lignes).
 * Auto-mémorise les déplacements/redimensionnements (Y < 0 inclus) sans jamais écraser à la fermeture.
 */
import { DesktopWindowBounds } from '../types/desktopWorkspace.types';
import { detachedWindowManager } from './detachedWindowManager';

export const SATELLITE_VISIBILITY_EVENT = 'studio-satellite-visibilitychange';

function sameBounds(a: DesktopWindowBounds, b: DesktopWindowBounds): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

function notifySatelliteVisibilityChanged(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new Event(SATELLITE_VISIBILITY_EVENT));
  } catch {}
}

export interface SatelliteWatcherCallbacks {
  onBoundsCaptured?: (bounds: DesktopWindowBounds) => void;
  onClosedByOS: () => void;
}

export function attachSatelliteWindowWatcher(
  popup: Window,
  getCallbacks: () => SatelliteWatcherCallbacks
): () => void {
  let closedHandled = false;
  let baselineBounds: DesktopWindowBounds | null = null;
  let readyToTrack = false;
  let debounceTimer: number | null = null;

  const clearPendingSave = () => {
    if (debounceTimer !== null) {
      window.clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  };

  const scheduleDebouncedBoundsCheck = () => {
    if (closedHandled || popup.closed || !readyToTrack) return;
    const cur = detachedWindowManager.getBounds('satellite');
    if (!cur) return;
    if (!baselineBounds) {
      baselineBounds = cur;
      return;
    }
    if (sameBounds(cur, baselineBounds)) return;
    baselineBounds = cur;
    clearPendingSave();
    debounceTimer = window.setTimeout(() => {
      debounceTimer = null;
      if (closedHandled || popup.closed || detachedWindowManager.isMainWindowUnloading()) return;
      const stable = detachedWindowManager.getBounds('satellite');
      if (stable) {
        baselineBounds = stable;
        getCallbacks().onBoundsCaptured?.(stable);
      }
    }, 350);
  };

  const initTimer = window.setTimeout(() => {
    if (closedHandled || popup.closed) return;
    baselineBounds = detachedWindowManager.getBounds('satellite') ?? null;
    readyToTrack = true;
  }, 900);

  const handlePopupClosed = () => {
    if (closedHandled) return;
    closedHandled = true;
    clearPendingSave();
    detachedWindowManager.unregister('satellite');
    notifySatelliteVisibilityChanged();
    if (!detachedWindowManager.isMainWindowUnloading()) getCallbacks().onClosedByOS();
  };

  const handleMainUnloading = () => {
    detachedWindowManager.setMainWindowUnloading(true);
    clearPendingSave();
    detachedWindowManager.closeWindow('satellite');
  };

  const popupDoc = popup.document;
  popup.addEventListener('resize', scheduleDebouncedBoundsCheck);
  popup.addEventListener('pagehide', handlePopupClosed);
  popup.addEventListener('unload', handlePopupClosed);
  popupDoc?.addEventListener?.('visibilitychange', notifySatelliteVisibilityChanged);
  window.addEventListener('pagehide', handleMainUnloading);
  window.addEventListener('beforeunload', handleMainUnloading);

  const pollId = window.setInterval(() => {
    if (popup.closed) handlePopupClosed();
    else scheduleDebouncedBoundsCheck();
  }, 800);

  return () => {
    closedHandled = true;
    window.clearTimeout(initTimer);
    clearPendingSave();
    window.clearInterval(pollId);
    popup.removeEventListener('resize', scheduleDebouncedBoundsCheck);
    popup.removeEventListener('pagehide', handlePopupClosed);
    popup.removeEventListener('unload', handlePopupClosed);
    popupDoc?.removeEventListener?.('visibilitychange', notifySatelliteVisibilityChanged);
    window.removeEventListener('pagehide', handleMainUnloading);
    window.removeEventListener('beforeunload', handleMainUnloading);
  };
}
