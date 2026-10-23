import { getMaxTicks } from '../../data';
import { getMeasureStartTick } from './audioParamsCache';
import { handleSpeedTrainerLap } from './speedTrainerProgress';
import { useSequencerStore } from '../../stores/useSequencerStore';

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
}

export function advanceMeasureOnTickBoundary(currentMeasureIdx: number, ctx: AdvanceMeasureContext): void {
  const store = useSequencerStore.getState();
  const isLoopRegionActive = ctx.isLoopRegionActiveRef.current && ctx.loopStartRef.current !== null && ctx.loopEndRef.current !== null;
  const loopEndMeasure = isLoopRegionActive ? ctx.loopEndRef.current! : ((ctx.totalMeasuresRef.current || 1) - 1);
  const loopStartMeasure = isLoopRegionActive ? ctx.loopStartRef.current! : 0;
  const isGlobalOrRegionLoop = isLoopRegionActive || (ctx.isLoopingRef ? ctx.isLoopingRef.current : store.isLooping);

  const isAtLoopEnd = (currentMeasureIdx === loopEndMeasure);

  if (isAtLoopEnd && isGlobalOrRegionLoop) {
    const isExitRequested = Boolean(ctx.isLoopExitRequestedRef?.current || store.isLoopExitRequested);
    const loopMode = ctx.loopModeRef?.current || store.loopMode || 'infinite';
    const currentIter = ctx.currentLoopIterationRef?.current || store.currentLoopIteration || 1;
    const isFixedLoopsReached = typeof loopMode === 'number' && loopMode > 0 && currentIter >= loopMode;

    if (isExitRequested || isFixedLoopsReached) {
      if (ctx.isLoopExitRequestedRef) ctx.isLoopExitRequestedRef.current = false;
      store.clearLoopExitRequest();

      if (ctx.currentLoopIterationRef) ctx.currentLoopIterationRef.current = 1;
      store.setCurrentLoopIteration(1);

      if (isLoopRegionActive) {
        ctx.isLoopRegionActiveRef.current = false;
        store.setIsLoopRegionActive(false);
      }

      const nextMeasure = currentMeasureIdx + 1;
      if (nextMeasure < (ctx.totalMeasuresRef.current || 1)) {
        ctx.measureCountRef.current = nextMeasure;
        ctx.setCurrentMeasure(nextMeasure);
      } else {
        if (store.isLooping) {
          ctx.measureCountRef.current = 0;
          ctx.setCurrentMeasure(0);
        } else {
          ctx.handleStop();
          return;
        }
      }
    } else if (store.pendingLoopRange) {
      const pending = store.pendingLoopRange;
      store.setPendingLoopRange(null);
      store.setLoopStartMeasure(pending.startMeasure);
      store.setLoopEndMeasure(pending.endMeasure);
      store.setIsLoopRegionActive(true);
      ctx.loopStartRef.current = pending.startMeasure;
      ctx.loopEndRef.current = pending.endMeasure;
      ctx.isLoopRegionActiveRef.current = true;
      if (ctx.currentLoopIterationRef) ctx.currentLoopIterationRef.current = 1;
      store.setCurrentLoopIteration(1);

      ctx.measureCountRef.current = pending.startMeasure;
      ctx.setCurrentMeasure(pending.startMeasure);
    } else {
      const nextIter = currentIter + 1;
      if (ctx.currentLoopIterationRef) ctx.currentLoopIterationRef.current = nextIter;
      store.setCurrentLoopIteration(nextIter);

      ctx.measureCountRef.current = loopStartMeasure;
      ctx.setCurrentMeasure(loopStartMeasure);

      handleSpeedTrainerLap({
        speedTrainerCurrentBpmRef: ctx.speedTrainerCurrentBpmRef as any,
        speedTrainerConsolidationLapsDoneRef: ctx.speedTrainerConsolidationLapsDoneRef as any,
        handleStop: ctx.handleStop,
      });
    }
  } else if (store.pendingLoopRange) {
    const songSections = store.songSections || [];
    const activeSection = songSections.find(s => s.startMeasure <= currentMeasureIdx && currentMeasureIdx <= s.endMeasure);
    const activeSectionEndMeasure = activeSection ? activeSection.endMeasure : null;

    if (activeSectionEndMeasure !== null && currentMeasureIdx === activeSectionEndMeasure) {
      const pending = store.pendingLoopRange;
      store.setPendingLoopRange(null);
      store.setLoopStartMeasure(pending.startMeasure);
      store.setLoopEndMeasure(pending.endMeasure);
      store.setIsLoopRegionActive(true);
      ctx.loopStartRef.current = pending.startMeasure;
      ctx.loopEndRef.current = pending.endMeasure;
      ctx.isLoopRegionActiveRef.current = true;
      if (ctx.currentLoopIterationRef) ctx.currentLoopIterationRef.current = 1;
      store.setCurrentLoopIteration(1);

      ctx.measureCountRef.current = pending.startMeasure;
      ctx.setCurrentMeasure(pending.startMeasure);
    } else {
      const nextMeasure = (currentMeasureIdx + 1) % (ctx.totalMeasuresRef.current || 1);
      ctx.measureCountRef.current = nextMeasure;
      ctx.setCurrentMeasure(nextMeasure);
    }
  } else {
    const nextMeasure = (currentMeasureIdx + 1) % (ctx.totalMeasuresRef.current || 1);
    ctx.measureCountRef.current = nextMeasure;
    ctx.setCurrentMeasure(nextMeasure);
    if (nextMeasure === 0 && currentMeasureIdx > 0 && (store.isLooping || Boolean(ctx.isLoopingRef?.current))) {
      handleSpeedTrainerLap({
        speedTrainerCurrentBpmRef: ctx.speedTrainerCurrentBpmRef as any,
        speedTrainerConsolidationLapsDoneRef: ctx.speedTrainerConsolidationLapsDoneRef as any,
        handleStop: ctx.handleStop,
      });
    }
  }

  const nextMIdx = ctx.measureCountRef.current;
  const nextSig = ctx.measureTimeSigsRef.current[nextMIdx] || '4/4';
  ctx.maxTicksRef.current = getMaxTicks(nextSig as any);
  ctx.currentMeasureStartTickRef.current = getMeasureStartTick(nextMIdx, ctx.measureTimeSigsRef.current);
  ctx.absoluteTickCountRef.current = ctx.currentMeasureStartTickRef.current;
}
