/**
 * useDesktopWorkspaceStore.ts — Store feuille pur de l'espace Multi-Écrans Studio (< 120 lignes).
 * Aucun import de `useSequencerStore` ni `useSequencerSettingsStore` (DAG 100 % sans cycle).
 */
import { create } from 'zustand';
import {
  BridgeViewMode,
  DesktopWindowBounds,
  DesktopWorkspaceLayout,
  SatelliteMode,
} from '../types/desktopWorkspace.types';
import {
  loadStoredLayouts,
  loadStoredSatelliteBounds,
  loadStoredSatelliteMode,
  persistLayouts,
  persistSatelliteBounds,
  persistSatelliteMode,
} from './helpers/desktopWorkspaceStorage';
import { PREFERRED_SCREEN_MODE_STORAGE_KEY } from '../utils/userPreferencesStorage';

const loadPreferredScreenMode = (): 'single' | 'dual' => {
  if (typeof window === 'undefined') return 'single';
  try {
    return localStorage.getItem(PREFERRED_SCREEN_MODE_STORAGE_KEY) === 'dual' ? 'dual' : 'single';
  } catch {
    return 'single';
  }
};

export interface DesktopWorkspaceStore {
  isSatelliteOpen: boolean;
  satelliteMode: SatelliteMode;
  satelliteBounds: DesktopWindowBounds | null;
  lastBridgeViewMode: BridgeViewMode;
  preferredScreenMode: 'single' | 'dual';
  hasDismissedDualPrompt: boolean;
  layouts: DesktopWorkspaceLayout[];
  activeLayoutId: string | null;

  setSatelliteState: (patch: { isSatelliteOpen?: boolean; satelliteMode?: SatelliteMode }) => void;
  setSatelliteBounds: (bounds: DesktopWindowBounds | null) => void;
  setLastBridgeViewMode: (mode: BridgeViewMode) => void;
  setPreferredScreenMode: (mode: 'single' | 'dual') => void;
  dismissDualPrompt: () => void;
  addLayoutSnapshot: (layout: DesktopWorkspaceLayout) => void;
  setActiveLayoutId: (id: string | null) => void;
  deleteLayout: (layoutId: string) => void;
  renameLayout: (layoutId: string, newName: string) => void;
}

export const useDesktopWorkspaceStore = create<DesktopWorkspaceStore>((set, get) => ({
  isSatelliteOpen: false,
  satelliteMode: loadStoredSatelliteMode(),
  satelliteBounds: loadStoredSatelliteBounds(),
  lastBridgeViewMode: 'roda',
  preferredScreenMode: loadPreferredScreenMode(),
  hasDismissedDualPrompt: false,
  layouts: loadStoredLayouts(),
  activeLayoutId: null,

  setSatelliteState: (patch) => {
    if (patch.satelliteMode) persistSatelliteMode(patch.satelliteMode);
    set((state) => ({
      isSatelliteOpen: patch.isSatelliteOpen ?? state.isSatelliteOpen,
      satelliteMode: patch.satelliteMode ?? state.satelliteMode,
    }));
  },

  setSatelliteBounds: (bounds) => {
    persistSatelliteBounds(bounds);
    set({ satelliteBounds: bounds });
  },

  setLastBridgeViewMode: (mode) => set({ lastBridgeViewMode: mode }),

  setPreferredScreenMode: (mode) => {
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(PREFERRED_SCREEN_MODE_STORAGE_KEY, mode); } catch {}
    }
    set({ preferredScreenMode: mode, hasDismissedDualPrompt: false });
  },

  dismissDualPrompt: () => set({ hasDismissedDualPrompt: true }),

  addLayoutSnapshot: (layout) => {
    const nextLayouts = [layout, ...get().layouts];
    persistLayouts(nextLayouts);
    set({ layouts: nextLayouts, activeLayoutId: layout.id });
  },

  setActiveLayoutId: (id) => set({ activeLayoutId: id }),

  deleteLayout: (layoutId) => {
    const nextLayouts = get().layouts.filter((l) => l.id !== layoutId);
    persistLayouts(nextLayouts);
    set((s) => ({
      layouts: nextLayouts,
      activeLayoutId: s.activeLayoutId === layoutId ? null : s.activeLayoutId,
    }));
  },

  renameLayout: (layoutId, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const nextLayouts = get().layouts.map((l) => (l.id === layoutId ? { ...l, name: trimmed } : l));
    persistLayouts(nextLayouts);
    set({ layouts: nextLayouts });
  },
}));
