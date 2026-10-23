/**
 * Slice Zustand pour le débrayage global des automations (< 60 lignes).
 */
import { StateCreator } from 'zustand';
import type { SequencerStore } from '../types/sequencerStoreTypes';
import { GlobalAutomationBypass } from '../../utils/automationBypassHelper';
import type { AutomationBypassSlice } from './automationBypassSliceTypes';

export type { AutomationBypassSlice };

export const createAutomationBypassSlice: StateCreator<SequencerStore, [], [], AutomationBypassSlice> = (set, get) => ({
  globalAutomationBypass: {
    all: false,
    volume: false,
    pan: false,
    reverb: false,
  },
  toggleGlobalAutomationBypass: (target) => {
    const current = get().globalAutomationBypass || { all: false, volume: false, pan: false, reverb: false };
    if (target === 'all') {
      const isCurrentlyBypassed = current.all || (current.volume && current.pan && current.reverb);
      const nextVal = !isCurrentlyBypassed;
      set({
        globalAutomationBypass: {
          all: nextVal,
          volume: nextVal,
          pan: nextVal,
          reverb: nextVal,
        },
      });
      return;
    }

    const nextParamVal = !current[target];
    const nextState: GlobalAutomationBypass = {
      ...current,
      [target]: nextParamVal,
    };
    nextState.all = nextState.volume && nextState.pan && nextState.reverb;
    set({ globalAutomationBypass: nextState });
  },
  setGlobalAutomationBypass: (bypass) => {
    const current = get().globalAutomationBypass;
    const nextState = { ...current, ...bypass };
    nextState.all = nextState.volume && nextState.pan && nextState.reverb;
    set({ globalAutomationBypass: nextState });
  },
});
