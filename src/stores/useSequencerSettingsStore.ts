import { create } from 'zustand';

interface SettingsState {
  bpm: number;
  balanco: number;
  isSettingsOpen: boolean;
  strokeDefaults: Record<string, { volume?: number; decay?: number }>;
  setBpm: (bpm: number) => void;
  setBalanco: (balanco: number) => void;
  setIsSettingsOpen: (isSettingsOpen: boolean) => void;
  toggleSettings: () => void;
  setStrokeDefault: (key: string, values: { volume?: number; decay?: number }) => void;
}

export const useSequencerSettingsStore = create<SettingsState>((set) => ({
  bpm: 120,
  balanco: 0,
  isSettingsOpen: false,
  strokeDefaults: {},
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
}));
