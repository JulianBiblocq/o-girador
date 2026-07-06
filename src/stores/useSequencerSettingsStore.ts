import { create } from 'zustand';

interface SettingsState {
  bpm: number;
  balanco: number;
  setBpm: (bpm: number) => void;
  setBalanco: (balanco: number) => void;
}

export const useSequencerSettingsStore = create<SettingsState>((set) => ({
  bpm: 120,
  balanco: 0,
  setBpm: (bpm) => set({ bpm }),
  setBalanco: (balanco) => set({ balanco }),
}));
