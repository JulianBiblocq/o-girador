/**
 * satelliteScreenPermission.ts — Gestionnaire Chromium `window-management` & `getScreenDetails()` (< 120 lignes).
 * Déclenche `getScreenDetails()` sur le geste utilisateur AVANT `window.open` avec repli inter-royaumes (`about:blank` -> `window`).
 */
import { ScreenRectLike } from './satelliteBoundsNormalizer';

export type WindowManagementPermissionState = 'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported';

interface ScreenDetailsLike {
  screens?: ScreenRectLike[];
  currentScreen?: ScreenRectLike;
  addEventListener?: (type: string, listener: () => void) => void;
}

type WinWithScreens = Window & { getScreenDetails?: () => Promise<ScreenDetailsLike> };

let permissionState: WindowManagementPermissionState = 'unknown';
let cachedScreens: ScreenRectLike[] = [];
let cachedCurrentScreen: ScreenRectLike | null = null;
let monitorInitialized = false;
let activeDetails: ScreenDetailsLike | null = null;
const listeners = new Set<(state: WindowManagementPermissionState) => void>();

function setPermissionState(next: WindowManagementPermissionState): void {
  if (permissionState === next) return;
  permissionState = next;
  listeners.forEach((cb) => { try { cb(permissionState); } catch {} });
}

function cacheScreenDetails(details: ScreenDetailsLike | null | undefined): ScreenRectLike[] | null {
  if (!details || !Array.isArray(details.screens)) return null;
  cachedScreens = details.screens;
  cachedCurrentScreen = details.currentScreen ?? null;
  if (activeDetails !== details) {
    activeDetails = details;
    try {
      details.addEventListener?.('screenschange', () => {
        if (Array.isArray(details.screens)) {
          cachedScreens = details.screens;
          cachedCurrentScreen = details.currentScreen ?? null;
        }
      });
    } catch {}
  }
  setPermissionState('granted');
  return cachedScreens;
}

function invokeGetScreenDetailsWithFallback(preferredWin?: Window | null): Promise<ScreenDetailsLike> | null {
  if (typeof window === 'undefined') return null;
  const mainWin = window as WinWithScreens;
  const pref = (preferredWin && !preferredWin.closed ? preferredWin : null) as WinWithScreens | null;

  if (pref && pref !== mainWin && typeof pref.getScreenDetails === 'function') {
    try {
      return pref.getScreenDetails().catch(() => {
        if (typeof mainWin.getScreenDetails === 'function') return mainWin.getScreenDetails();
        throw new Error('getScreenDetails unavailable');
      });
    } catch {
      // Repli immédiat synchrone vers window principal si about:blank refuse l'appel
    }
  }
  if (typeof mainWin.getScreenDetails === 'function') {
    try { return mainWin.getScreenDetails(); } catch { return null; }
  }
  return null;
}

export function initWindowManagementPermissionMonitor(): void {
  if (monitorInitialized || typeof window === 'undefined') return;
  monitorInitialized = true;
  const mainWin = window as WinWithScreens;
  if (typeof mainWin.getScreenDetails !== 'function') {
    setPermissionState('unsupported');
    return;
  }
  const perms = typeof navigator !== 'undefined' ? navigator.permissions : undefined;
  if (!perms || typeof perms.query !== 'function') return;

  perms.query({ name: 'window-management' as PermissionName }).then((status) => {
    const sync = () => {
      if (status.state === 'granted') {
        setPermissionState('granted');
        const p = invokeGetScreenDetailsWithFallback(window);
        if (p) void p.then(cacheScreenDetails).catch(() => {});
      } else {
        setPermissionState(status.state === 'denied' ? 'denied' : 'prompt');
      }
    };
    sync();
    status.addEventListener?.('change', sync);
  }).catch(() => {});
}

export function requestScreenDetailsOnUserGesture(preferredWin?: Window | null): Promise<ScreenRectLike[] | null> {
  initWindowManagementPermissionMonitor();
  if (permissionState === 'denied' || permissionState === 'unsupported') return Promise.resolve(null);
  const promise = invokeGetScreenDetailsWithFallback(preferredWin);
  if (!promise) return Promise.resolve(null);

  return promise.then(cacheScreenDetails).catch(() => {
    const perms = typeof navigator !== 'undefined' ? navigator.permissions : undefined;
    if (perms?.query) {
      void perms.query({ name: 'window-management' as PermissionName }).then((st) => {
        if (st.state === 'denied') setPermissionState('denied');
      }).catch(() => {});
    }
    return cachedScreens.length > 0 ? cachedScreens : null;
  });
}

export function getCachedScreens(): ScreenRectLike[] {
  initWindowManagementPermissionMonitor();
  return cachedScreens;
}

export function getCachedCurrentScreen(): ScreenRectLike | null {
  return cachedCurrentScreen;
}

export function subscribeWindowManagementPermission(cb: (state: WindowManagementPermissionState) => void): () => void {
  initWindowManagementPermissionMonitor();
  listeners.add(cb);
  cb(permissionState);
  return () => listeners.delete(cb);
}

export function __resetScreenPermissionForTests(screens: ScreenRectLike[] = [], state: WindowManagementPermissionState = 'unknown'): void {
  cachedScreens = screens;
  cachedCurrentScreen = screens[0] ?? null;
  permissionState = state;
  monitorInitialized = false;
}
