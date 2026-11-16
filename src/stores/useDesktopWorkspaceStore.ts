/**
 * useDesktopWorkspaceStore.ts — Store feuille pur de l'espace Multi-Écrans Studio (< 80 lignes).
 * Aucun import de `useSequencerStore` ni `useSequencerSettingsStore` (DAG 100 % sans cycle).
 */
import { create } from 'zustand';
import {
  BridgeViewMode,
  DesktopWindowBounds,
  SatelliteMode,
} from '../types/desktopWorkspace.types';
import {
  loadStoredSatelliteBounds,
  loadStoredSatelliteMode,
  parseSignedSatelliteBounds,
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

  setSatelliteState: (patch: { isSatelliteOpen?: boolean; satelliteMode?: SatelliteMode }) => void;
  setSatelliteBounds: (bounds: DesktopWindowBounds | null) => void;
  setLastBridgeViewMode: (mode: BridgeViewMode) => void;
  setPreferredScreenMode: (mode: 'single' | 'dual') => void;
  dismissDualPrompt: () => void;
}

export const useDesktopWorkspaceStore = create<DesktopWorkspaceStore>((set) => ({
  isSatelliteOpen: false,
  satelliteMode: loadStoredSatelliteMode(),
  satelliteBounds: loadStoredSatelliteBounds(),
  lastBridgeViewMode: 'roda',
  preferredScreenMode: loadPreferredScreenMode(),
  hasDismissedDualPrompt: false,

  setSatelliteState: (patch) => {
    if (patch.satelliteMode) persistSatelliteMode(patch.satelliteMode);
    set((state) => ({
      isSatelliteOpen: patch.isSatelliteOpen ?? state.isSatelliteOpen,
      satelliteMode: patch.satelliteMode ?? state.satelliteMode,
    }));
  },

  setSatelliteBounds: (bounds) => {
    const clean = bounds ? parseSignedSatelliteBounds(bounds) : null;
    if (bounds && !clean) return;
    persistSatelliteBounds(clean);
    set({ satelliteBounds: clean });
  },

  setLastBridgeViewMode: (mode) => set({ lastBridgeViewMode: mode }),

  setPreferredScreenMode: (mode) => {
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(PREFERRED_SCREEN_MODE_STORAGE_KEY, mode); } catch {}
    }
    set({ preferredScreenMode: mode, hasDismissedDualPrompt: false });
  },

  dismissDualPrompt: () => set({ hasDismissedDualPrompt: true }),
}));
