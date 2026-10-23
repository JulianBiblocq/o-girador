
export interface PlaybackSlice {
  currentMeasure: number;
  currentExpandedMeasureIdx: number;
  loopStartMeasure: number | null;
  loopEndMeasure: number | null;
  isLoopRegionActive: boolean;
  isLooping: boolean;
  loopMode: 'infinite' | number;
  currentLoopIteration: number;
  isLoopBypassed: boolean;
  isLoopExitRequested: boolean;
  pendingLoopRange: { startMeasure: number; endMeasure: number } | null;
  isPreRolling: boolean;
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
  setPendingLoopRange: (range: { startMeasure: number; endMeasure: number } | null) => void;
  setLoopStartMeasure: (measure: number | null | ((prev: number | null) => number | null)) => void;
  setLoopEndMeasure: (measure: number | null | ((prev: number | null) => number | null)) => void;
  setCurrentMeasure: (measure: number | ((prev: number) => number)) => void;
  setCurrentExpandedMeasureIdx: (idx: number | ((prev: number) => number)) => void;
  setIsPreRolling: (isPreRolling: boolean) => void;
}
