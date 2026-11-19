/**
 * desktopWorkspaceStorage.ts — Persistance locale des modes et coordonnées signées Écran 2 (< 75 lignes).
 * Préserve intégralement les coordonnées négatives (ex: Y = -1080 en haut, X < 0 à gauche).
 */
import { DesktopWindowBounds, SatelliteMode } from '../../types/desktopWorkspace.types';

const BOUNDS_STORAGE_KEY = 'girador_satellite_window_bounds';
const MODE_STORAGE_KEY = 'girador_satellite_last_mode';
const MINIMIZED_SENTINEL = -10000;

function isValidMode(val: unknown): val is SatelliteMode {
  return val === 'mixer' || val === 'editor' || val === 'oficina';
}

export function parseSignedSatelliteBounds(raw: unknown): DesktopWindowBounds | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  if (
    typeof b.x !== 'number' || !Number.isFinite(b.x) || b.x <= MINIMIZED_SENTINEL ||
    typeof b.y !== 'number' || !Number.isFinite(b.y) || b.y <= MINIMIZED_SENTINEL ||
    typeof b.width !== 'number' || !Number.isFinite(b.width) || b.width < 200 ||
    typeof b.height !== 'number' || !Number.isFinite(b.height) || b.height < 200
  ) {
    return null;
  }
  return {
    x: Math.round(b.x),
    y: Math.round(b.y),
    width: Math.max(480, Math.round(b.width)),
    height: Math.max(360, Math.round(b.height)),
  };
}

export function loadStoredSatelliteMode(): SatelliteMode {
  if (typeof window === 'undefined') return 'mixer';
  try {
    const val = localStorage.getItem(MODE_STORAGE_KEY);
    return isValidMode(val) ? val : 'mixer';
  } catch {
    return 'mixer';
  }
}

export function persistSatelliteMode(mode: SatelliteMode): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(MODE_STORAGE_KEY, mode); } catch {}
}

export function loadStoredSatelliteBounds(): DesktopWindowBounds | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BOUNDS_STORAGE_KEY);
    return raw ? parseSignedSatelliteBounds(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function persistSatelliteBounds(bounds: DesktopWindowBounds | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!bounds) {
      localStorage.removeItem(BOUNDS_STORAGE_KEY);
      return;
    }
    const clean = parseSignedSatelliteBounds(bounds);
    if (clean) localStorage.setItem(BOUNDS_STORAGE_KEY, JSON.stringify(clean));
  } catch {}
}
