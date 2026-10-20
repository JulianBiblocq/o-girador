import { getMaxTicks } from '../../data';
import { getMeasureStartTick } from './audioParamsCache';
import { handleSpeedTrainerLap } from './speedTrainerProgress';

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
  speedTrainerCurrentBpmRef: { current: number };
  speedTrainerConsolidationLapsDoneRef: { current: number };
  handleStop: () => void;
  setCurrentMeasure: (m: number) => void;
}

export function advanceMeasureOnTickBoundary(currentMeasureIdx: number, ctx: AdvanceMeasureContext): void {
  const isLoopActive = ctx.isLoopRegionActiveRef.current && ctx.loopStartRef.current !== null && ctx.loopEndRef.current !== null;

  if (isLoopActive && currentMeasureIdx === ctx.loopEndRef.current) {
    ctx.measureCountRef.current = ctx.loopStartRef.current!;
    ctx.setCurrentMeasure(ctx.loopStartRef.current!);
  } else {
    ctx.measureCountRef.current = (currentMeasureIdx + 1) % (ctx.totalMeasuresRef.current || 1);
    ctx.setCurrentMeasure(ctx.measureCountRef.current);
  }

  const nextMIdx = ctx.measureCountRef.current;
  const nextSig = ctx.measureTimeSigsRef.current[nextMIdx] || '4/4';
  ctx.maxTicksRef.current = getMaxTicks(nextSig as any);
  ctx.currentMeasureStartTickRef.current = getMeasureStartTick(nextMIdx, ctx.measureTimeSigsRef.current);
  ctx.absoluteTickCountRef.current = ctx.currentMeasureStartTickRef.current;

  handleSpeedTrainerLap({
    nextTour: nextMIdx,
    speedTrainerCurrentBpmRef: ctx.speedTrainerCurrentBpmRef as any,
    speedTrainerConsolidationLapsDoneRef: ctx.speedTrainerConsolidationLapsDoneRef as any,
    handleStop: ctx.handleStop,
  });
}
