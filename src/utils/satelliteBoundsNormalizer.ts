/**
 * satelliteBoundsNormalizer.ts — Normalisation géométrique multi-écrans & correction DWM Windows 10/11 (< 120 lignes).
 * Recale (-8, -1088, 1936, 1096) dans l'aire utile `availLeft..availTop..availWidth..availHeight` du moniteur cible.
 */
import { DesktopWindowBounds } from '../types/desktopWorkspace.types';

export const MINIMIZED_THRESHOLD = -10000;
const MIN_VALID_SIZE = 200;
const MIN_CLAMP_WIDTH = 480;
const MIN_CLAMP_HEIGHT = 360;

export interface ScreenRectLike {
  availLeft?: number;
  availTop?: number;
  availWidth?: number;
  availHeight?: number;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
}

function resolveScreenAvailRect(s: ScreenRectLike) {
  const availLeft = Number.isFinite(s.availLeft) ? Math.round(Number(s.availLeft)) : Math.round(Number(s.left ?? 0));
  const availTop = Number.isFinite(s.availTop) ? Math.round(Number(s.availTop)) : Math.round(Number(s.top ?? 0));
  const availWidth = Math.max(MIN_CLAMP_WIDTH, Math.round(Number(s.availWidth ?? s.width ?? 1920)));
  const availHeight = Math.max(MIN_CLAMP_HEIGHT, Math.round(Number(s.availHeight ?? s.height ?? 1080)));
  const fullLeft = Number.isFinite(s.left) ? Math.round(Number(s.left)) : availLeft;
  const fullTop = Number.isFinite(s.top) ? Math.round(Number(s.top)) : availTop;
  const fullWidth = Math.max(availWidth, Math.round(Number(s.width ?? availWidth)));
  const fullHeight = Math.max(availHeight, Math.round(Number(s.height ?? availHeight)));
  return { availLeft, availTop, availWidth, availHeight, fullLeft, fullTop, fullWidth, fullHeight };
}

export function isValidRawBounds(raw?: Partial<DesktopWindowBounds> | null): raw is DesktopWindowBounds {
  if (!raw || typeof raw !== 'object') return false;
  const { x, y, width, height } = raw;
  return (
    typeof x === 'number' && Number.isFinite(x) && x > MINIMIZED_THRESHOLD &&
    typeof y === 'number' && Number.isFinite(y) && y > MINIMIZED_THRESHOLD &&
    typeof width === 'number' && Number.isFinite(width) && width >= MIN_VALID_SIZE &&
    typeof height === 'number' && Number.isFinite(height) && height >= MIN_VALID_SIZE
  );
}

export function findTargetScreenForBounds(
  bounds: DesktopWindowBounds,
  screens: ScreenRectLike[]
): ScreenRectLike | null {
  if (!Array.isArray(screens) || screens.length === 0) return null;
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;

  for (const s of screens) {
    const r = resolveScreenAvailRect(s);
    if (cx >= r.fullLeft && cx <= r.fullLeft + r.fullWidth && cy >= r.fullTop && cy <= r.fullTop + r.fullHeight) {
      return s;
    }
  }

  let best = screens[0];
  let bestDistSq = Infinity;
  for (const s of screens) {
    const r = resolveScreenAvailRect(s);
    const dx = cx < r.availLeft ? r.availLeft - cx : cx > r.availLeft + r.availWidth ? cx - (r.availLeft + r.availWidth) : 0;
    const dy = cy < r.availTop ? r.availTop - cy : cy > r.availTop + r.availHeight ? cy - (r.availTop + r.availHeight) : 0;
    const dSq = dx * dx + dy * dy;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      best = s;
    }
  }
  return best;
}

export function clampBoundsToScreenWorkArea(
  bounds: DesktopWindowBounds,
  screen: ScreenRectLike
): DesktopWindowBounds {
  const { availLeft, availTop, availWidth, availHeight } = resolveScreenAvailRect(screen);
  const width = Math.min(Math.max(MIN_CLAMP_WIDTH, Math.round(bounds.width)), availWidth);
  const height = Math.min(Math.max(MIN_CLAMP_HEIGHT, Math.round(bounds.height)), availHeight);
  const x = Math.min(Math.max(availLeft, Math.round(bounds.x)), availLeft + availWidth - width);
  const y = Math.min(Math.max(availTop, Math.round(bounds.y)), availTop + availHeight - height);
  return { x, y, width, height };
}

export function normalizeCapturedLiveBounds(
  raw?: Partial<DesktopWindowBounds> | null,
  winScreen?: ScreenRectLike | null,
  knownScreens?: ScreenRectLike[] | null
): DesktopWindowBounds | null {
  if (!isValidRawBounds(raw)) return null;
  const base: DesktopWindowBounds = {
    x: Math.round(raw.x),
    y: Math.round(raw.y),
    width: Math.max(MIN_CLAMP_WIDTH, Math.round(raw.width)),
    height: Math.max(MIN_CLAMP_HEIGHT, Math.round(raw.height)),
  };

  if (knownScreens && knownScreens.length > 0) {
    const target = findTargetScreenForBounds(base, knownScreens);
    if (target) return clampBoundsToScreenWorkArea(base, target);
  }

  if (winScreen) {
    const availW = Number(winScreen.availWidth ?? winScreen.width ?? 0);
    const availH = Number(winScreen.availHeight ?? winScreen.height ?? 0);
    const hasRealAvailOrigin =
      Number.isFinite(winScreen.availLeft) &&
      Number.isFinite(winScreen.availTop) &&
      ((Number(winScreen.availTop) !== 0 || base.y >= -32) && (Number(winScreen.availLeft) !== 0 || base.x >= -32));

    if (hasRealAvailOrigin && availW >= MIN_CLAMP_WIDTH && availH >= MIN_CLAMP_HEIGHT) {
      return clampBoundsToScreenWorkArea(base, winScreen);
    }

    // Heuristique DWM Windows 10/11 : uniquement si la fenêtre déborde réellement (raw.width > winScreen.availWidth)
    if (availW >= MIN_CLAMP_WIDTH && raw.width > availW) {
      const pad = Math.round((raw.width - availW) / 2);
      if (pad >= 4 && pad <= 16) {
        const cleanH = availH >= MIN_CLAMP_HEIGHT ? Math.min(base.height - pad * 2, availH) : base.height - pad * 2;
        return {
          x: base.x + pad,
          y: base.y + pad,
          width: Math.round(availW),
          height: Math.max(MIN_CLAMP_HEIGHT, Math.round(cleanH)),
        };
      }
    }
  }

  return base;
}
