/**
 * detachedWindowManager.ts — Gestionnaire de l'unique Fenêtre Satellite Studio (< 130 lignes).
 * Préserve strictement les coordonnées signées (moniteurs à gauche/en haut) et protège `studio_dual` au déchargement.
 */
import { DetachedPanelKey, DesktopWindowBounds } from '../types/desktopWorkspace.types';
import {
  buildSatellitePopupFeatures,
  sanitizeSignedBounds,
  tryAutoPlaceOnSecondaryScreen,
} from './satelliteScreenPlacement';

const SATELLITE_WINDOW_NAME = 'OGiradorStudioSatellite';

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
      if (savedBounds) this.applyBoundsToOpenWindow('satellite', savedBounds);
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
    try { popup.focus(); } catch {}

    if (!effectiveBounds) {
      void tryAutoPlaceOnSecondaryScreen(popup, onAutoPlaced);
    }
    return popup;
  }

  getBounds(panel: DetachedPanelKey = 'satellite'): DesktopWindowBounds | undefined {
    const win = this.getWindow(panel);
    if (!win) return undefined;
    try {
      const rawX = win.screenX ?? win.screenLeft;
      const rawY = win.screenY ?? win.screenTop;
      const rawW = win.outerWidth || win.innerWidth;
      const rawH = win.outerHeight || win.innerHeight;
      if (!Number.isFinite(rawW) || !Number.isFinite(rawH) || rawW < 200 || rawH < 200) return undefined;
      return {
        x: Number.isFinite(rawX) ? Math.round(rawX) : 0,
        y: Number.isFinite(rawY) ? Math.round(rawY) : 0,
        width: Math.round(rawW),
        height: Math.round(rawH),
      };
    } catch {
      return undefined;
    }
  }

  setPendingBounds(panel: DetachedPanelKey, bounds?: DesktopWindowBounds): void {
    if (bounds) this.pendingBounds.set(panel, sanitizeSignedBounds(bounds));
    else this.pendingBounds.delete(panel);
  }

  applyBoundsToOpenWindow(panel: DetachedPanelKey, bounds: DesktopWindowBounds): boolean {
    const win = this.getWindow(panel);
    if (!win) return false;
    try {
      const safe = sanitizeSignedBounds(bounds);
      win.moveTo(safe.x, safe.y);
      win.resizeTo(safe.width, safe.height);
      win.focus();
      return true;
    } catch {
      return false;
    }
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
