import { create } from 'zustand';

interface SettingsState {
  bpm: number;
  balanco: number;
  isSettingsOpen: boolean;
  strokeDefaults: Record<string, { volume?: number; decay?: number }>;
  enabledSignalIds: string[] | null;
  forcedStrokes: Record<string, boolean>;
  setBpm: (bpm: number) => void;
  setBalanco: (balanco: number) => void;
  setIsSettingsOpen: (isSettingsOpen: boolean) => void;
  toggleSettings: () => void;
  setStrokeDefault: (key: string, values: { volume?: number; decay?: number }) => void;
  toggleSignalEnabled: (id: string, allIds?: string[]) => void;
  setStrokeForcedState: (key: string, enabled: boolean) => void;
}

export const useSequencerSettingsStore = create<SettingsState>((set) => ({
  bpm: 120,
  balanco: 0,
  isSettingsOpen: false,
  strokeDefaults: {},
  enabledSignalIds: null,
  forcedStrokes: {},
  setBpm: (bpm) => set({ bpm }),
  setBalanco: (balanco) => set({ balanco }),
  setIsSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
  setStrokeDefault: (key, values) => set((state) => ({
    strokeDefaults: {
      ...state.strokeDefaults,
      [key]: {
        ...(state.strokeDefaults[key] || {}),
        ...values
      }
    }
  })),
  toggleSignalEnabled: (id, allIds) => set((state) => {
    const current = state.enabledSignalIds !== null 
      ? state.enabledSignalIds 
      : (allIds || []);
    const next = current.includes(id) 
      ? current.filter(x => x !== id) 
      : [...current, id];
    return { enabledSignalIds: next };
  }),
  setStrokeForcedState: (key, enabled) => set((state) => ({
    forcedStrokes: {
      ...state.forcedStrokes,
      [key]: enabled
    }
  })),
}));
