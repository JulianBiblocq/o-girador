
import * as Tone from 'tone';
import { useSequencerStore } from '../../stores/useSequencerStore';

export interface LiveTempoParams {
  speedTrainerCurrentBpmRef: React.MutableRefObject<number>;
  measureCountRef: React.MutableRefObject<number>;
  totalMeasuresRef: React.MutableRefObject<number>;
  measureBpmsRef: React.MutableRefObject<number[]>;
  currentStepIndexRef: React.MutableRefObject<number>;
  maxTicksRef: React.MutableRefObject<number>;
  fallbackBpm: number;
}

export function resolveLiveTickDuration(params: LiveTempoParams): number {
  if (useSequencerStore.getState().isSpeedTrainerActive) {
    const stBpm = params.speedTrainerCurrentBpmRef.current
      || useSequencerStore.getState().speedTrainerCurrentBpm
      || Tone.Transport.bpm.value;
    return 2.5 / Math.max(1, stBpm);
  }

  const store = useSequencerStore.getState();
  const totalM = params.totalMeasuresRef.current || 1;
  const currentMeasureIdx = params.measureCountRef.current % totalM;
  const rawBpm = params.measureBpmsRef.current?.[currentMeasureIdx];
  const currentBpm = (rawBpm && !isNaN(rawBpm) && rawBpm > 0)
    ? rawBpm
    : (params.fallbackBpm || store.bpm || 100);

  const transitions = store.measureBpmTransitions;
  const transition = transitions?.[currentMeasureIdx] || 'immediate';

  if (transition === 'immediate' || currentMeasureIdx >= totalM - 1) {
    return 2.5 / currentBpm;
  }

  const nextMeasureIdx = (currentMeasureIdx + 1) % totalM;
  const nextRawBpm = params.measureBpmsRef.current?.[nextMeasureIdx];
  const nextBpm = (nextRawBpm && !isNaN(nextRawBpm) && nextRawBpm > 0) ? nextRawBpm : currentBpm;

  const maxTicks = Math.max(1, params.maxTicksRef.current || 96);
  const stepIdx = Math.max(0, params.currentStepIndexRef.current || 0);
  const ratio = Math.min(1, Math.max(0, stepIdx / maxTicks));

  const interpolatedBpm = currentBpm + (nextBpm - currentBpm) * ratio;
  return 2.5 / Math.max(1, interpolatedBpm);
}
