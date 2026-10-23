
import { Pattern } from '../../types/store.types';
import { getBeatsPerMeasure } from '../../utils/measureHelpers';
import { useAudioStore } from '../../stores/useAudioStore';
import { AlignmentMetrics } from './audioAlignmentTypes';

export function calculateAlignmentMetrics(params: {
  targetMeasureIdx?: number | null;
  bpm: number;
  measureBpms: number[];
  measureTimeSigs: string[];
  pattern: Pattern;
  preRollDurationSec: number;
}): AlignmentMetrics {
  const { targetMeasureIdx, bpm, measureBpms, measureTimeSigs, pattern, preRollDurationSec } = params;

  const storeTargetMeasure = useAudioStore.getState().targetMeasureIdx;
  const effectiveMeasure = (targetMeasureIdx !== undefined && targetMeasureIdx !== null && targetMeasureIdx >= 0)
    ? targetMeasureIdx
    : (storeTargetMeasure !== null && storeTargetMeasure !== undefined && storeTargetMeasure >= 0)
      ? storeTargetMeasure
      : 0;

  const anchorBpm = (measureBpms && measureBpms[effectiveMeasure % (measureBpms.length || 1)] > 0)
    ? measureBpms[effectiveMeasure % (measureBpms.length || 1)]
    : bpm;
  const targetSig = (measureTimeSigs && measureTimeSigs[effectiveMeasure % (measureTimeSigs.length || 1)]) || '4/4';
  const beatsCount = getBeatsPerMeasure(targetSig);
  const isCompound = targetSig === '6/8' || targetSig === '9/8' || targetSig === '12/8';
  const beatDurationSec = isCompound ? (90 / anchorBpm) : (60 / anchorBpm);
  const patternMeasures = Math.max(1, pattern.measureAssignments?.filter(Boolean).length || 1);

  const mPrev = Math.max(0, effectiveMeasure - 1);
  const prevBpm = (measureBpms && measureBpms[mPrev % (measureBpms.length || 1)] > 0)
    ? measureBpms[mPrev % (measureBpms.length || 1)]
    : anchorBpm;
  const prevSig = (measureTimeSigs && measureTimeSigs[mPrev % (measureTimeSigs.length || 1)]) || '4/4';
  const prevBeats = getBeatsPerMeasure(prevSig);
  const isCompoundPrev = prevSig === '6/8' || prevSig === '9/8' || prevSig === '12/8';
  const prevBeatDuration = isCompoundPrev ? (90 / prevBpm) : (60 / prevBpm);

  const t_temps1 = effectiveMeasure >= 1
    ? (prevBeats * prevBeatDuration)
    : (preRollDurationSec > 0 ? preRollDurationSec : beatsCount * beatDurationSec);

  const measureCycleDurationSec = patternMeasures * beatsCount * beatDurationSec;

  return {
    effectiveMeasure, anchorBpm, targetSig, beatsCount, isCompound, beatDurationSec,
    patternMeasures, mPrev, prevBpm, prevSig, prevBeats, isCompoundPrev,
    prevBeatDuration, t_temps1, measureCycleDurationSec,
  };
}
