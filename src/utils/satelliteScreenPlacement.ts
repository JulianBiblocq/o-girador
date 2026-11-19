/**
 * satelliteScreenPlacement.ts — Placement multi-écrans signé pour la Fenêtre Satellite (< 120 lignes).
 * Préserve les moniteurs en Y < 0 / X < 0, compense le cadre interne/externe de window.open et recale via ScreenDetails.
 */
import { DesktopWindowBounds } from '../types/desktopWorkspace.types';
import {
  MINIMIZED_THRESHOLD,
  ScreenRectLike,
  clampBoundsToScreenWorkArea,
  normalizeCapturedLiveBounds,
} from './satelliteBoundsNormalizer';
import { getCachedCurrentScreen, getCachedScreens } from './satelliteScreenPermission';

export const DEFAULT_SATELLITE_BOUNDS: DesktopWindowBounds = {
  x: 80,
  y: 60,
  width: 1280,
  height: 820,
};

const POPUP_CHROME_WIDTH_PAD = 16;
const POPUP_CHROME_HEIGHT_PAD = 40;

export function sanitizeSignedBounds(
  bounds?: Partial<DesktopWindowBounds> | null,
  knownScreens?: ScreenRectLike[] | null
): DesktopWindowBounds {
  const width = Number.isFinite(bounds?.width) ? Math.max(480, Math.round(bounds!.width!)) : DEFAULT_SATELLITE_BOUNDS.width;
  const height = Number.isFinite(bounds?.height) ? Math.max(360, Math.round(bounds!.height!)) : DEFAULT_SATELLITE_BOUNDS.height;
  const x = Number.isFinite(bounds?.x) && bounds!.x! > MINIMIZED_THRESHOLD ? Math.round(bounds!.x!) : DEFAULT_SATELLITE_BOUNDS.x;
  const y = Number.isFinite(bounds?.y) && bounds!.y! > MINIMIZED_THRESHOLD ? Math.round(bounds!.y!) : DEFAULT_SATELLITE_BOUNDS.y;
  const raw: DesktopWindowBounds = { x, y, width, height };
  const screens = knownScreens ?? getCachedScreens();
  return normalizeCapturedLiveBounds(raw, null, screens) ?? raw;
}

export function buildSatellitePopupFeatures(bounds?: Partial<DesktopWindowBounds> | null): string {
  const b = sanitizeSignedBounds(bounds);
  const innerW = Math.max(480, b.width - POPUP_CHROME_WIDTH_PAD);
  const innerH = Math.max(360, b.height - POPUP_CHROME_HEIGHT_PAD);
  return [
    'popup=yes',
    `left=${b.x}`,
    `top=${b.y}`,
    `width=${innerW}`,
    `height=${innerH}`,
    'menubar=no',
    'toolbar=no',
    'location=no',
    'status=no',
    'resizable=yes',
    'scrollbars=yes',
  ].join(',');
}

export function applyMoveAndResize(win: Window, safe: DesktopWindowBounds): void {
  if (win.closed) return;
  try {
    win.moveTo(safe.x, safe.y);
    win.resizeTo(safe.width, safe.height);
    win.moveTo(safe.x, safe.y);
  } catch {}
}

export function enforceSignedPopupBounds(
  popupWin: Window,
  bounds: DesktopWindowBounds,
  pendingScreensPromise?: Promise<ScreenRectLike[] | null> | null,
  onNormalized?: (bounds: DesktopWindowBounds) => void
): void {
  const safe = sanitizeSignedBounds(bounds);
  applyMoveAndResize(popupWin, safe);

  window.setTimeout(() => {
    if (popupWin.closed) return;
    const latestSafe = sanitizeSignedBounds(bounds);
    applyMoveAndResize(popupWin, latestSafe);
  }, 60);

  if (pendingScreensPromise) {
    void pendingScreensPromise
      .then((screens) => {
        if (popupWin.closed || !screens || screens.length === 0) return;
        const clamped = normalizeCapturedLiveBounds(bounds, popupWin.screen as ScreenRectLike, screens) ?? safe;
        applyMoveAndResize(popupWin, clamped);
        if (
          clamped.x !== bounds.x ||
          clamped.y !== bounds.y ||
          clamped.width !== bounds.width ||
          clamped.height !== bounds.height
        ) {
          onNormalized?.(clamped);
        }
      })
      .catch(() => {});
  }
}

export async function tryAutoPlaceOnSecondaryScreen(
  popupWin: Window,
  pendingScreensPromise?: Promise<ScreenRectLike[] | null> | null,
  onPlaced?: (bounds: DesktopWindowBounds) => void
): Promise<void> {
  try {
    if (popupWin.closed) return;
    const screens = (await pendingScreensPromise) ?? getCachedScreens();
    if (!Array.isArray(screens) || screens.length < 2 || popupWin.closed) return;
    const current = getCachedCurrentScreen();
    const secondary = screens.find((s) => s !== current) || screens[1];
    if (!secondary) return;
    const rawTarget: DesktopWindowBounds = {
      x: Math.round(Number(secondary.availLeft ?? secondary.left ?? 0)),
      y: Math.round(Number(secondary.availTop ?? secondary.top ?? 0)),
      width: Math.max(640, Math.round(Number(secondary.availWidth ?? DEFAULT_SATELLITE_BOUNDS.width))),
      height: Math.max(480, Math.round(Number(secondary.availHeight ?? DEFAULT_SATELLITE_BOUNDS.height))),
    };
    const target = clampBoundsToScreenWorkArea(rawTarget, secondary);
    applyMoveAndResize(popupWin, target);
    onPlaced?.(target);
  } catch {}
}
