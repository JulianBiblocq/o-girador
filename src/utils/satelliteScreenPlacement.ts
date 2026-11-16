/**
 * satelliteScreenPlacement.ts — Placement multi-écrans signé pour la Fenêtre Satellite (< 105 lignes).
 * Zéro `Math.max(0, ...)` sur `x`/`y` afin de préserver les moniteurs placés à gauche ou au-dessus (Y = -1080).
 */
import { DesktopWindowBounds } from '../types/desktopWorkspace.types';

const MINIMIZED_SENTINEL = -16000;

export const DEFAULT_SATELLITE_BOUNDS: DesktopWindowBounds = {
  x: 80,
  y: 60,
  width: 1280,
  height: 820,
};

export function sanitizeSignedBounds(bounds?: Partial<DesktopWindowBounds> | null): DesktopWindowBounds {
  const width = Number.isFinite(bounds?.width) ? Math.max(480, Math.round(bounds!.width!)) : DEFAULT_SATELLITE_BOUNDS.width;
  const height = Number.isFinite(bounds?.height) ? Math.max(360, Math.round(bounds!.height!)) : DEFAULT_SATELLITE_BOUNDS.height;
  const x = Number.isFinite(bounds?.x) && bounds!.x! > MINIMIZED_SENTINEL ? Math.round(bounds!.x!) : DEFAULT_SATELLITE_BOUNDS.x;
  const y = Number.isFinite(bounds?.y) && bounds!.y! > MINIMIZED_SENTINEL ? Math.round(bounds!.y!) : DEFAULT_SATELLITE_BOUNDS.y;
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

function applyMoveAndResize(win: Window, safe: DesktopWindowBounds): void {
  if (win.closed) return;
  try {
    win.moveTo(safe.x, safe.y);
    win.resizeTo(safe.width, safe.height);
    win.moveTo(safe.x, safe.y);
  } catch {}
}

export function enforceSignedPopupBounds(popupWin: Window, bounds: DesktopWindowBounds): void {
  const safe = sanitizeSignedBounds(bounds);
  applyMoveAndResize(popupWin, safe);

  window.setTimeout(() => {
    if (popupWin.closed) return;
    applyMoveAndResize(popupWin, safe);

    try {
      const curX = popupWin.screenX ?? popupWin.screenLeft ?? 0;
      const curY = popupWin.screenY ?? popupWin.screenTop ?? 0;
      const wasClamped = Math.abs(curX - safe.x) > 96 || Math.abs(curY - safe.y) > 96;
      const getScreenDetails = (window as unknown as { getScreenDetails?: () => Promise<unknown> }).getScreenDetails;
      if (wasClamped && typeof getScreenDetails === 'function') {
        void getScreenDetails.call(window).then(() => {
          applyMoveAndResize(popupWin, safe);
        }).catch(() => {});
      }
    } catch {}
  }, 75);
}

export async function tryAutoPlaceOnSecondaryScreen(
  popupWin: Window,
  onPlaced?: (bounds: DesktopWindowBounds) => void
): Promise<void> {
  try {
    const getScreenDetails = (window as unknown as { getScreenDetails?: () => Promise<any> }).getScreenDetails;
    if (typeof getScreenDetails !== 'function' || popupWin.closed) return;
    const details = await getScreenDetails.call(window);
    const screens: any[] = Array.isArray(details?.screens) ? details.screens : [];
    if (screens.length < 2 || popupWin.closed) return;
    const current = details.currentScreen;
    const secondary = screens.find((s) => s !== current) || screens[1];
    if (!secondary) return;
    const target: DesktopWindowBounds = {
      x: Math.round(Number(secondary.availLeft ?? secondary.left ?? 0)),
      y: Math.round(Number(secondary.availTop ?? secondary.top ?? 0)),
      width: Math.max(640, Math.round(Number(secondary.availWidth ?? DEFAULT_SATELLITE_BOUNDS.width))),
      height: Math.max(480, Math.round(Number(secondary.availHeight ?? DEFAULT_SATELLITE_BOUNDS.height))),
    };
    applyMoveAndResize(popupWin, target);
    onPlaced?.(target);
  } catch {}
}
