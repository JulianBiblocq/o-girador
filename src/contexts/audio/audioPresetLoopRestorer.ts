import { useSequencerStore } from '../../stores/useSequencerStore';

export interface RestoredPresetLoopState {
  loadedLoopMode: any;
  isLoopRegionActive: boolean;
  loadedIsLooping: boolean;
  loopStartMeasure: number | null;
  loopEndMeasure: number | null;
}

export function restorePresetLoopState(p: any, sequencer: any): RestoredPresetLoopState {
  const store = useSequencerStore.getState();
  store.clearLoopExitRequest();
  store.setIsLoopBypassed(false);
  store.setCurrentLoopIteration(1);

  const loadedLoopMode = p.loopMode !== undefined ? p.loopMode : 'infinite';
  store.setLoopMode(loadedLoopMode);

  const loopStartMeasure = p.loopStartMeasure !== undefined ? p.loopStartMeasure : null;
  const loopEndMeasure = p.loopEndMeasure !== undefined ? p.loopEndMeasure : null;
  const hasLoop = loopStartMeasure !== null && loopStartMeasure !== undefined;
  const isLoopRegionActive = p.isLoopRegionActive !== undefined ? p.isLoopRegionActive : hasLoop;
  const loadedIsLooping = p.isLooping !== undefined ? p.isLooping : (loadedLoopMode !== 1 || isLoopRegionActive);

  sequencer.setLoopStartMeasure(loopStartMeasure);
  sequencer.setLoopEndMeasure(loopEndMeasure);
  sequencer.setIsLoopRegionActive(isLoopRegionActive);
  sequencer.setIsLooping(loadedIsLooping);

  if (sequencer.loopModeRef) sequencer.loopModeRef.current = loadedLoopMode;
  if (sequencer.isLoopRegionActiveRef) sequencer.isLoopRegionActiveRef.current = isLoopRegionActive;
  if (sequencer.loopStartRef) sequencer.loopStartRef.current = loopStartMeasure;
  if (sequencer.loopEndRef) sequencer.loopEndRef.current = loopEndMeasure;
  if (sequencer.isLoopingRef) sequencer.isLoopingRef.current = loadedIsLooping;
  if (sequencer.isLoopExitRequestedRef) sequencer.isLoopExitRequestedRef.current = false;

  return { loadedLoopMode, isLoopRegionActive, loadedIsLooping, loopStartMeasure, loopEndMeasure };
}
