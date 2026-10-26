import { getMaxTicks } from '../../data';
import { getMeasureStartTick } from './audioParamsCache';
import { handleSpeedTrainerLap } from './speedTrainerProgress';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { AdvanceMeasureContext } from './measureAdvanceTypes';

export type { AdvanceMeasureContext };

function applyPendingLoopRange(pending: { startMeasure: number; endMeasure: number }, store: any, ctx: AdvanceMeasureContext): void {
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
}

export function advanceMeasureOnTickBoundary(currentMeasureIdx: number, ctx: AdvanceMeasureContext): void {
  if (ctx.soloPatternPlayIdRef?.current !== null && ctx.soloPatternPlayIdRef?.current !== undefined) {
    ctx.measureCountRef.current = currentMeasureIdx;
    ctx.setCurrentMeasure(currentMeasureIdx);
    ctx.currentMeasureStartTickRef.current = getMeasureStartTick(currentMeasureIdx, ctx.measureTimeSigsRef.current);
    ctx.absoluteTickCountRef.current = ctx.currentMeasureStartTickRef.current;
    return;
  }

  const store = useSequencerStore.getState();
  const totalMeasures = ctx.totalMeasuresRef.current || 1;
  const lastMeasureIdx = totalMeasures - 1;

  const isLoopRegionActive = Boolean(
    ctx.isLoopRegionActiveRef.current &&
    ctx.loopStartRef.current !== null &&
    ctx.loopEndRef.current !== null
  );
  const loopStartMeasure = isLoopRegionActive ? ctx.loopStartRef.current! : 0;
  const loopEndMeasure = isLoopRegionActive ? ctx.loopEndRef.current! : lastMeasureIdx;

  const loopMode = ctx.loopModeRef?.current ?? store.loopMode ?? 'infinite';
  const isExitRequested = Boolean(ctx.isLoopExitRequestedRef?.current || store.isLoopExitRequested);
  const isLoopBypassed = Boolean(store.isLoopBypassed);
  const isLooping = ctx.isLoopingRef ? ctx.isLoopingRef.current : store.isLooping;
  const currentIter = ctx.currentLoopIterationRef?.current ?? store.currentLoopIteration ?? 1;

  if (isLoopBypassed) {
    if (currentMeasureIdx >= lastMeasureIdx) { ctx.handleStop(); return; }
    const nextMeasure = currentMeasureIdx + 1;
    ctx.measureCountRef.current = nextMeasure; ctx.setCurrentMeasure(nextMeasure);
  } else if (isLoopRegionActive) {
    if (currentMeasureIdx === loopEndMeasure) {
      const isFixedLoopsReached = typeof loopMode === 'number' && loopMode > 0 && currentIter >= loopMode;
      const shouldExit = isExitRequested || isFixedLoopsReached || !isLooping;

      if (shouldExit) {
        if (ctx.isLoopExitRequestedRef) ctx.isLoopExitRequestedRef.current = false;
        store.clearLoopExitRequest();
        if (ctx.currentLoopIterationRef) ctx.currentLoopIterationRef.current = 1;
        store.setCurrentLoopIteration(1);
        store.setIsLoopBypassed(true);
        if (loopEndMeasure >= lastMeasureIdx) { ctx.handleStop(); return; }
        const nextMeasure = loopEndMeasure + 1;
        ctx.measureCountRef.current = nextMeasure; ctx.setCurrentMeasure(nextMeasure);
      } else if (store.pendingLoopRange) {
        applyPendingLoopRange(store.pendingLoopRange, store, ctx);
      } else {
        const nextIter = currentIter + 1;
        if (ctx.currentLoopIterationRef) ctx.currentLoopIterationRef.current = nextIter;
        store.setCurrentLoopIteration(nextIter);
        ctx.measureCountRef.current = loopStartMeasure; ctx.setCurrentMeasure(loopStartMeasure);
        handleSpeedTrainerLap({
          speedTrainerCurrentBpmRef: ctx.speedTrainerCurrentBpmRef as any,
          speedTrainerConsolidationLapsDoneRef: ctx.speedTrainerConsolidationLapsDoneRef as any,
          handleStop: ctx.handleStop,
        });
      }
    } else {
      const nextMeasure = currentMeasureIdx + 1;
      ctx.measureCountRef.current = nextMeasure; ctx.setCurrentMeasure(nextMeasure);
    }
  } else {
    if (store.pendingLoopRange) {
      const songSections = store.songSections || [];
      const activeSection = songSections.find(s => s.startMeasure <= currentMeasureIdx && currentMeasureIdx <= s.endMeasure);
      const activeSectionEndMeasure = activeSection ? activeSection.endMeasure : null;

      if (activeSectionEndMeasure !== null && currentMeasureIdx === activeSectionEndMeasure) {
        applyPendingLoopRange(store.pendingLoopRange, store, ctx);
      } else {
        const nextMeasure = currentMeasureIdx + 1;
        if (nextMeasure >= totalMeasures) { ctx.handleStop(); return; }
        ctx.measureCountRef.current = nextMeasure; ctx.setCurrentMeasure(nextMeasure);
      }
    } else if (currentMeasureIdx >= lastMeasureIdx) {
      const isLinear1x = loopMode === 1 || !isLooping;
      const isFixedLoopsReached = typeof loopMode === 'number' && loopMode > 0 && currentIter >= loopMode;

      if (isExitRequested || isLinear1x || isFixedLoopsReached) {
        if (ctx.isLoopExitRequestedRef) ctx.isLoopExitRequestedRef.current = false;
        store.clearLoopExitRequest();
        if (ctx.currentLoopIterationRef) ctx.currentLoopIterationRef.current = 1;
        store.setCurrentLoopIteration(1);
        ctx.handleStop();
        return;
      }

      const nextIter = currentIter + 1;
      if (ctx.currentLoopIterationRef) ctx.currentLoopIterationRef.current = nextIter;
      store.setCurrentLoopIteration(nextIter);
      ctx.measureCountRef.current = 0; ctx.setCurrentMeasure(0);
      handleSpeedTrainerLap({
        speedTrainerCurrentBpmRef: ctx.speedTrainerCurrentBpmRef as any,
        speedTrainerConsolidationLapsDoneRef: ctx.speedTrainerConsolidationLapsDoneRef as any,
        handleStop: ctx.handleStop,
      });
    } else {
      const nextMeasure = currentMeasureIdx + 1;
      ctx.measureCountRef.current = nextMeasure; ctx.setCurrentMeasure(nextMeasure);
    }
  }

  const nextMIdx = ctx.measureCountRef.current;
  const nextSig = ctx.measureTimeSigsRef.current[nextMIdx] || '4/4';
  ctx.maxTicksRef.current = getMaxTicks(nextSig as any);
  ctx.currentMeasureStartTickRef.current = getMeasureStartTick(nextMIdx, ctx.measureTimeSigsRef.current);
  ctx.absoluteTickCountRef.current = ctx.currentMeasureStartTickRef.current;
}
