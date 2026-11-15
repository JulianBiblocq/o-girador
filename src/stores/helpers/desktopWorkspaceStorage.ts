/**
 * desktopWorkspaceStorage.ts — Persistance locale des modes, coordonnées signées et dispositions (< 90 lignes).
 */
import {
  DesktopWindowBounds,
  DesktopWorkspaceLayout,
  SatelliteMode,
} from '../../types/desktopWorkspace.types';

const LAYOUTS_STORAGE_KEY = 'girador_desktop_workspace_layouts_v2';
const BOUNDS_STORAGE_KEY = 'girador_satellite_window_bounds';
const MODE_STORAGE_KEY = 'girador_satellite_last_mode';

function isValidMode(val: unknown): val is SatelliteMode {
  return val === 'mixer' || val === 'editor' || val === 'oficina';
}

function parseBounds(raw: unknown): DesktopWindowBounds | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  if (
    typeof b.x !== 'number' || !Number.isFinite(b.x) ||
    typeof b.y !== 'number' || !Number.isFinite(b.y) ||
    typeof b.width !== 'number' || !Number.isFinite(b.width) ||
    typeof b.height !== 'number' || !Number.isFinite(b.height)
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
    return raw ? parseBounds(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function persistSatelliteBounds(bounds: DesktopWindowBounds | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!bounds) localStorage.removeItem(BOUNDS_STORAGE_KEY);
    else localStorage.setItem(BOUNDS_STORAGE_KEY, JSON.stringify(bounds));
  } catch {}
}

export function loadStoredLayouts(): DesktopWorkspaceLayout[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LAYOUTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === 'object' && typeof item.id === 'string')
      .map((item): DesktopWorkspaceLayout => ({
        id: item.id,
        name: String(item.name || 'Studio'),
        createdAt: Number(item.createdAt) || Date.now(),
        satelliteOpen: Boolean(item.satelliteOpen ?? true),
        satelliteMode: isValidMode(item.satelliteMode) ? item.satelliteMode : 'mixer',
        satelliteBounds: parseBounds(item.satelliteBounds) ?? undefined,
        bridgeViewMode: item.bridgeViewMode === 'timeline' ? 'timeline' : 'roda',
        uiState: item.uiState,
      }));
  } catch {
    return [];
  }
}

export function persistLayouts(layouts: DesktopWorkspaceLayout[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(LAYOUTS_STORAGE_KEY, JSON.stringify(layouts)); } catch {}
}
