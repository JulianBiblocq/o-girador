/**
 * satelliteScreenPlacement.ts — Placement multi-écrans signé pour la Fenêtre Satellite (< 80 lignes).
 * Aucun `Math.max(0, ...)` sur `x`/`y` afin de préserver les moniteurs placés à gauche ou au-dessus.
 */
import { DesktopWindowBounds } from '../types/desktopWorkspace.types';

export const DEFAULT_SATELLITE_BOUNDS: DesktopWindowBounds = {
  x: 80,
  y: 60,
  width: 1280,
  height: 820,
};

export function sanitizeSignedBounds(bounds?: Partial<DesktopWindowBounds> | null): DesktopWindowBounds {
  const width = Number.isFinite(bounds?.width) ? Math.max(480, Math.round(bounds!.width!)) : DEFAULT_SATELLITE_BOUNDS.width;
  const height = Number.isFinite(bounds?.height) ? Math.max(360, Math.round(bounds!.height!)) : DEFAULT_SATELLITE_BOUNDS.height;
  const x = Number.isFinite(bounds?.x) ? Math.round(bounds!.x!) : DEFAULT_SATELLITE_BOUNDS.x;
  const y = Number.isFinite(bounds?.y) ? Math.round(bounds!.y!) : DEFAULT_SATELLITE_BOUNDS.y;
  return { x, y, width, height };
}

export function buildSatellitePopupFeatures(bounds?: Partial<DesktopWindowBounds> | null): string {
  const b = sanitizeSignedBounds(bounds);
  return [
    `left=${b.x}`,
    `top=${b.y}`,
    `width=${b.width}`,
    `height=${b.height}`,
    'menubar=no',
    'toolbar=no',
    'location=no',
    'status=no',
    'resizable=yes',
    'scrollbars=yes',
  ].join(',');
}

export async function tryAutoPlaceOnSecondaryScreen(
  popupWin: Window,
  onPlaced?: (bounds: DesktopWindowBounds) => void
): Promise<void> {
  try {
    const getScreenDetails = (window as any).getScreenDetails;
    if (typeof getScreenDetails !== 'function' || popupWin.closed) return;
    const details = await getScreenDetails.call(window);
    const screens: any[] = Array.isArray(details?.screens) ? details.screens : [];
    if (screens.length < 2 || popupWin.closed) return;
    const current = details.currentScreen;
    const secondary = screens.find((s) => s !== current) || screens[1];
    if (!secondary) return;
    const x = Math.round(Number(secondary.availLeft ?? secondary.left ?? 0));
    const y = Math.round(Number(secondary.availTop ?? secondary.top ?? 0));
    const width = Math.max(640, Math.round(Number(secondary.availWidth ?? DEFAULT_SATELLITE_BOUNDS.width)));
    const height = Math.max(480, Math.round(Number(secondary.availHeight ?? DEFAULT_SATELLITE_BOUNDS.height)));
    popupWin.moveTo(x, y);
    popupWin.resizeTo(width, height);
    onPlaced?.({ x, y, width, height });
  } catch {
    // Permission refusée ou API Window Management non disponible : silence total.
  }
}
