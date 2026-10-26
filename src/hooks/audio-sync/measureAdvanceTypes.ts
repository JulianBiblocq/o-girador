export interface AdvanceMeasureContext {
  measureCountRef: { current: number };
  totalMeasuresRef: { current: number };
  measureTimeSigsRef: { current: Record<number, string> };
  maxTicksRef: { current: number };
  currentMeasureStartTickRef: { current: number };
  absoluteTickCountRef: { current: number };
  isLoopRegionActiveRef: { current: boolean };
  loopStartRef: { current: number | null };
  loopEndRef: { current: number | null };
  isLoopingRef?: { current: boolean };
  loopModeRef?: { current: 'infinite' | number };
  isLoopExitRequestedRef?: { current: boolean };
  currentLoopIterationRef?: { current: number };
  speedTrainerCurrentBpmRef: { current: number };
  speedTrainerConsolidationLapsDoneRef: { current: number };
  handleStop: () => void;
  setCurrentMeasure: (m: number) => void;
  soloPatternPlayIdRef?: { current: number | null };
}
