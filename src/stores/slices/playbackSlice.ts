import { StateCreator } from 'zustand';
import type { SequencerStore } from '../useSequencerStore';

export interface PlaybackSlice {
  currentMeasure: number;
  currentExpandedMeasureIdx: number;
  loopStartMeasure: number | null;
  loopEndMeasure: number | null;
  isLoopRegionActive: boolean;
  isLooping: boolean;
  loopMode: 'infinite' | number; // 'infinite' or fixed iterations
  currentLoopIteration: number; // For UI countdown display
  isLoopBypassed: boolean; // True when loop is bypassed and finishing linear sequence
  isLoopExitRequested: boolean;
  isPreRolling: boolean; // True pendant le décompte pré-roll (count-in) avant la mesure 1
  isPlaying: boolean;

  handleSetLoopStart: (measure: number | null) => void;
  handleSetLoopEnd: (measure: number | null) => void;
  handleClearLoop: () => void;
  setIsLoopRegionActive: (val: boolean | ((prev: boolean) => boolean)) => void;
  setIsLooping: (looping: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  setLoopMode: (mode: 'infinite' | number) => void;
  setCurrentLoopIteration: (iteration: number) => void;
  setIsLoopBypassed: (bypassed: boolean) => void;
  requestLoopExit: () => void;
  clearLoopExitRequest: () => void;
  setLoopStartMeasure: (measure: number | null | ((prev: number | null) => number | null)) => void;
  setLoopEndMeasure: (measure: number | null | ((prev: number | null) => number | null)) => void;
  setCurrentMeasure: (measure: number | ((prev: number) => number)) => void;
  setCurrentExpandedMeasureIdx: (idx: number | ((prev: number) => number)) => void;
  setIsPreRolling: (isPreRolling: boolean) => void;
}

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
