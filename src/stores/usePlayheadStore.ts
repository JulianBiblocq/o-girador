import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

export interface PlayheadState {
  currentStepIndex: number;
  setPlayhead: (index: number) => void;
}

// Store Vanilla (sans React) pour éviter les re-rendus des composants React
export const playheadVanillaStore = createStore<PlayheadState>((set) => ({
  currentStepIndex: 0,
  setPlayhead: (index) => set({ currentStepIndex: index }),
}));

// Hook React qui s'abonne au store Vanilla
export function usePlayheadStore<T>(selector: (state: PlayheadState) => T): T {
  return useStore(playheadVanillaStore, selector);
}
