/**
 * detachedWindowManager.ts — Gestionnaire de l'unique Fenêtre Satellite Studio (< 135 lignes).
 * Préserve strictement les coordonnées signées (Y = -1080 en haut, X < 0 à gauche) sous Chromium/Windows.
 */
import { DetachedPanelKey, DesktopWindowBounds } from '../types/desktopWorkspace.types';
import {
  buildSatellitePopupFeatures,
  enforceSignedPopupBounds,
  sanitizeSignedBounds,
  tryAutoPlaceOnSecondaryScreen,
} from './satelliteScreenPlacement';

const SATELLITE_WINDOW_NAME = 'OGiradorStudioSatellite';
const MINIMIZED_SENTINEL = -16000;

class DetachedWindowManager {
  private windows = new Map<DetachedPanelKey, Window>();
  private pendingBounds = new Map<DetachedPanelKey, DesktopWindowBounds>();
  private mainWindowUnloading = false;

  setMainWindowUnloading(unloading: boolean): void {
    this.mainWindowUnloading = unloading;
  }

  isMainWindowUnloading(): boolean {
    return this.mainWindowUnloading;
  }

  register(panel: DetachedPanelKey, win: Window | null | undefined): void {
    if (win && !win.closed) {
      this.windows.set(panel, win);
    } else {
      this.windows.delete(panel);
    }
  }

  unregister(panel: DetachedPanelKey): void {
    this.windows.delete(panel);
  }

  getWindow(panel: DetachedPanelKey = 'satellite'): Window | null {
    const win = this.windows.get(panel);
    if (win && !win.closed) return win;
    if (win && win.closed) this.windows.delete(panel);
    return null;
  }

  isPanelOpen(panel: DetachedPanelKey = 'satellite'): boolean {
    return this.getWindow(panel) !== null;
  }

  openSatellitePopup(
    savedBounds?: DesktopWindowBounds | null,
    onAutoPlaced?: (bounds: DesktopWindowBounds) => void
  ): Window | null {
    if (typeof window === 'undefined') return null;
    this.mainWindowUnloading = false;
    const existing = this.getWindow('satellite');
    if (existing) {
      if (savedBounds) enforceSignedPopupBounds(existing, savedBounds);
      try { existing.focus(); } catch {}
      return existing;
    }

    const effectiveBounds = savedBounds ?? this.pendingBounds.get('satellite') ?? null;
    const features = buildSatellitePopupFeatures(effectiveBounds);
    let popup: Window | null = null;
    try {
      popup = window.open('', SATELLITE_WINDOW_NAME, features);
    } catch {
      popup = null;
    }
    if (!popup || popup.closed) return null;

    this.register('satellite', popup);
    this.pendingBounds.delete('satellite');

    if (effectiveBounds) {
      enforceSignedPopupBounds(popup, effectiveBounds);
    } else {
      void tryAutoPlaceOnSecondaryScreen(popup, onAutoPlaced);
    }
    try { popup.focus(); } catch {}
    return popup;
  }

  getBounds(panel: DetachedPanelKey = 'satellite'): DesktopWindowBounds | undefined {
    const win = this.getWindow(panel);
    if (!win || win.closed) return undefined;
    try {
      const rawX = typeof win.screenX === 'number' ? win.screenX : win.screenLeft;
      const rawY = typeof win.screenY === 'number' ? win.screenY : win.screenTop;
      const rawW = win.outerWidth || win.innerWidth;
      const rawH = win.outerHeight || win.innerHeight;
      if (
        !Number.isFinite(rawX) || !Number.isFinite(rawY) ||
        !Number.isFinite(rawW) || !Number.isFinite(rawH) ||
        rawX <= MINIMIZED_SENTINEL || rawY <= MINIMIZED_SENTINEL ||
        rawW < 200 || rawH < 200
      ) {
        return undefined;
      }
      return {
        x: Math.round(rawX),
        y: Math.round(rawY),
        width: Math.round(rawW),
        height: Math.round(rawH),
      };
    } catch {
      return undefined;
    }
  }

  applyBoundsToOpenWindow(panel: DetachedPanelKey, bounds: DesktopWindowBounds): boolean {
    const win = this.getWindow(panel);
    if (!win || win.closed) return false;
    enforceSignedPopupBounds(win, sanitizeSignedBounds(bounds));
    try { win.focus(); } catch {}
    return true;
  }

  focusWindow(panel: DetachedPanelKey = 'satellite'): void {
    const win = this.getWindow(panel);
    if (!win) return;
    try { win.focus(); } catch {}
  }

  closeWindow(panel: DetachedPanelKey = 'satellite'): void {
    const win = this.windows.get(panel);
    this.windows.delete(panel);
    if (win && !win.closed) {
      try { win.close(); } catch {}
    }
  }
}

export const detachedWindowManager = new DetachedWindowManager();
