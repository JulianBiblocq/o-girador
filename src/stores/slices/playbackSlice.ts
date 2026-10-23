import { StateCreator } from 'zustand';
import type { SequencerStore } from '../types/sequencerStoreTypes';
import type { PlaybackSlice } from './playbackSliceTypes';

export type { PlaybackSlice };

export const createPlaybackSlice: StateCreator<SequencerStore, [], [], PlaybackSlice> = (set, get) => ({
  currentMeasure: 0,
  currentExpandedMeasureIdx: 0,
  loopStartMeasure: null,
  loopEndMeasure: null,
  isLoopRegionActive: true,
  isLooping: true,
  isPlaying: false,
  loopMode: 'infinite',
  currentLoopIteration: 1,
  isLoopBypassed: false,
  isLoopExitRequested: false,
  pendingLoopRange: null,
  isPreRolling: false,

  setIsPreRolling: (isPreRolling) => set({ isPreRolling }),

  setCurrentMeasure: (updater) => set(state => {
    const raw = typeof updater === 'function' ? updater(state.currentMeasure) : updater;
    const safe = Math.max(0, Math.min(raw, (state.totalMeasures || 1) - 1));
    return { currentMeasure: safe };
  }),
  setCurrentExpandedMeasureIdx: (updater) => set(state => ({ currentExpandedMeasureIdx: typeof updater === 'function' ? updater(state.currentExpandedMeasureIdx) : updater })),
  setLoopStartMeasure: (updater) => set(state => ({ loopStartMeasure: typeof updater === 'function' ? updater(state.loopStartMeasure) : updater })),
  setLoopEndMeasure: (updater) => set(state => ({ loopEndMeasure: typeof updater === 'function' ? updater(state.loopEndMeasure) : updater })),

  setLoopMode: (mode) => set({ loopMode: mode }),
  setCurrentLoopIteration: (iteration) => set({ currentLoopIteration: iteration }),
  setIsLoopBypassed: (bypassed) => set({ isLoopBypassed: bypassed }),
  requestLoopExit: () => set({ isLoopExitRequested: true }),
  clearLoopExitRequest: () => set({ isLoopExitRequested: false }),
  setPendingLoopRange: (range) => set({ pendingLoopRange: range }),

  handleSetLoopStart: (measureIdx) => {
    if (measureIdx !== null) get().pushUndoState();
    set((state) => {
      const updates: Partial<PlaybackSlice> = {
        loopStartMeasure: measureIdx,
        isLoopRegionActive: measureIdx !== null,
      };
      if (measureIdx !== null && state.loopEndMeasure !== null && measureIdx > state.loopEndMeasure) {
        updates.loopEndMeasure = measureIdx;
      }
      return updates;
    });
  },

  handleSetLoopEnd: (measureIdx) => {
    if (measureIdx !== null) get().pushUndoState();
    set((state) => {
      const updates: Partial<PlaybackSlice> = {
        loopEndMeasure: measureIdx,
        isLoopRegionActive: measureIdx !== null,
      };
      if (measureIdx !== null && state.loopStartMeasure !== null && measureIdx < state.loopStartMeasure) {
        updates.loopStartMeasure = measureIdx;
      }
      return updates;
    });
  },

  handleClearLoop: () => set({ loopStartMeasure: null, loopEndMeasure: null, isLoopRegionActive: false }),
  setIsLoopRegionActive: (updater) => set(state => ({ isLoopRegionActive: typeof updater === 'function' ? (updater as any)(state.isLoopRegionActive) : updater })),
  setIsLooping: (looping) => set({ isLooping: looping }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
});
