
import React from 'react';
import { useTransportStore } from '../../stores/useTransportStore';
import { useBalancoStore } from '../../stores/useBalancoStore';
import { computeStepBalancoPercent } from '../../utils/balancoUtils';
import { Pattern, Track } from '../../types';

interface UseGridSwingOffsetsParams {
  pattern: Pattern;
  track?: Track;
}

export function useGridSwingOffsets({ pattern, track }: UseGridSwingOffsetsParams) {
  const globalSwing = useTransportStore(state => state.globalSwing);
  const balancoPresets = useBalancoStore(state => state.presets);

  const swingOffsets = React.useMemo(() => {
    const stepsCount = pattern?.steps ?? 16;
    const resArr = pattern?.beatResolutions;
    const offsets = new Float32Array(stepsCount);
    for (let i = 0; i < stepsCount; i++) {
      offsets[i] = computeStepBalancoPercent({
        stepIdx: i,
        steps: stepsCount,
        beatResolutions: resArr,
        track,
        pattern,
        globalSwing
      });
    }
    return offsets;
  }, [
    pattern?.steps,
    pattern?.beatResolutions,
    pattern?.balancoPresetId,
    pattern?.balancoAmount,
    pattern?.swingIntensity,
    track?.balancoPresetId,
    track?.balancoAmount,
    track?.swingIntensity,
    globalSwing,
    balancoPresets
  ]);

  const getStepSwingPercent = React.useCallback((stepIdx: number, steps: number, beatResolutions?: number[]) => {
    return computeStepBalancoPercent({
      stepIdx,
      steps,
      beatResolutions,
      track,
      pattern,
      globalSwing
    });
  }, [track, pattern, globalSwing]);

  return { swingOffsets, getStepSwingPercent };
}
