/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StateCreator } from 'zustand';
import type { SequencerStore } from '../types/sequencerStoreTypes';
import { PracticeModeSlice } from './practiceModeSliceTypes';
import { resolveInitialPracticeMode } from '../helpers/practiceModeHelpers';

export const createPracticeModeSlice: StateCreator<SequencerStore, [], [], PracticeModeSlice> = (set, get) => ({
  isPracticeMode: resolveInitialPracticeMode(),
  setIsPracticeMode: (val: boolean) => {
    set({ isPracticeMode: val });
    if (val) {
      get().closeDetailEditor();
      set({ isTracksCollapsed: true });
    }
  },
  togglePracticeMode: () => {
    const nextVal = !get().isPracticeMode;
    get().setIsPracticeMode(nextVal);
  },
});
