/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DetachedPanelKey, DesktopWindowBounds } from '../types/desktopWorkspace.types';

class DetachedWindowManager {
  private windows = new Map<DetachedPanelKey, Window>();
  private pendingBounds = new Map<DetachedPanelKey, DesktopWindowBounds>();

  /**
   * Enregistre l'instance Window d'un panneau détaché lors de son ouverture
   */
  register(panel: DetachedPanelKey, win: Window | null | undefined): void {
    if (!win || win.closed) return;
    this.windows.set(panel, win);
  }

  /**
   * Désenregistre un panneau détaché
   */
  unregister(panel: DetachedPanelKey): void {
    this.windows.delete(panel);
  }

  /**
   * Récupère la référence Window vivante d'un panneau
   */
  getWindow(panel: DetachedPanelKey): Window | null {
    const win = this.windows.get(panel);
    if (!win || win.closed) {
      this.windows.delete(panel);
      return null;
    }
    return win;
  }

  /**
   * Indique si un panneau est actuellement ouvert en fenêtre secondaire
   */
  isPanelOpen(panel: DetachedPanelKey): boolean {
    return Boolean(this.getWindow(panel));
  }

  /**
   * Capture les coordonnées et dimensions physiques d'une fenêtre détachée
   * NOTE: Supporte impérativement les coordonnées négatives (multi-écrans à gauche/au-dessus)
   */
  getBounds(panel: DetachedPanelKey): DesktopWindowBounds | undefined {
    const win = this.getWindow(panel);
    if (!win) return undefined;

    try {
      const screenX = typeof win.screenX === 'number' ? win.screenX : (win as any).screenLeft;
      const screenY = typeof win.screenY === 'number' ? win.screenY : (win as any).screenTop;
      const width = win.outerWidth || win.innerWidth || 1024;
      const height = win.outerHeight || win.innerHeight || 768;

      if (typeof screenX === 'number' && typeof screenY === 'number') {
        return {
          screenX: Math.round(screenX), // Coordonnées négatives préservées
          screenY: Math.round(screenY), // Coordonnées négatives préservées
          width: Math.round(width),
          height: Math.round(height),
        };
      }
    } catch (err) {
      console.warn(`[DetachedWindowManager] Erreur lors de la lecture des coordonnées de ${panel}:`, err);
    }
    return undefined;
  }

  /**
   * Stocke les dimensions et coordonnées cibles pour l'ouverture prochaine d'un panneau
   */
  setPendingBounds(panel: DetachedPanelKey, bounds?: DesktopWindowBounds): void {
    if (bounds) {
      this.pendingBounds.set(panel, bounds);
    } else {
      this.pendingBounds.delete(panel);
    }
  }

  /**
   * Récupère les dimensions et coordonnées mémorisées
   */
  getPendingBounds(panel: DetachedPanelKey): DesktopWindowBounds | undefined {
    return this.pendingBounds.get(panel);
  }

  /**
   * Tente de repositionner / redimensionner une fenêtre déjà ouverte
   */
  applyBoundsToOpenWindow(panel: DetachedPanelKey, bounds: DesktopWindowBounds): boolean {
    const win = this.getWindow(panel);
    if (!win) return false;

    try {
      if (typeof win.moveTo === 'function') {
        win.moveTo(bounds.screenX, bounds.screenY);
      }
      if (typeof win.resizeTo === 'function') {
        win.resizeTo(bounds.width, bounds.height);
      }
      if (typeof win.focus === 'function') {
        win.focus();
      }
      return true;
    } catch (err) {
      console.warn(`[DetachedWindowManager] Impossible de déplacer la fenêtre ${panel}:`, err);
      return false;
    }
  }
}

export const detachedWindowManager = new DetachedWindowManager();
