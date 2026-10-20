import { GlobalSwing } from '../../types';
import { getBeatsPerMeasure } from '../../utils/measureHelpers';
import { nextRandom } from './audioParamsCache';

interface ComputeSwingProps {
  time: number;
  stepIdx: number;
  currentTicks: number;
  timeSig: string;
  stepDurationSec: number;
  globalSwing: GlobalSwing;
}

export function computeTickSwingOffset({
  time,
  stepIdx,
  currentTicks,
  timeSig,
  stepDurationSec,
  globalSwing,
}: ComputeSwingProps): { swingOffset: number; swingTime: number; posInGroup: number } {
  let swingOffset = 0;
  let posInGroup = 0;
  const globalMode = globalSwing.mode;

  if (globalMode !== 'off') {
    const beatsCount = getBeatsPerMeasure(timeSig);
    const ticksPerBeat = currentTicks / beatsCount;
    const posInBeat = ((stepIdx / ticksPerBeat) % 1) * 4;
    posInGroup = Math.round(posInBeat) % 4;

    const swingJitter = (nextRandom() * 0.06 - 0.03) * stepDurationSec;
    const intensity = (globalSwing.swingIntensity !== undefined ? globalSwing.swingIntensity : 100) / 100;

    if (globalMode === 'maracatu') {
      if (posInGroup === 0) {
        swingOffset = swingJitter;
      } else if (posInGroup === 1) {
        swingOffset = (0.04 * intensity * stepDurationSec) + swingJitter;
      } else if (posInGroup === 2) {
        const minimalJitter = (nextRandom() * 0.02 - 0.01) * stepDurationSec;
        swingOffset = (-0.144 * intensity * stepDurationSec) + minimalJitter;
      } else if (posInGroup === 3) {
        swingOffset = (-0.292 * intensity * stepDurationSec) + swingJitter;
      }
    } else if (globalMode === 'custom') {
      const customOffsetPct = globalSwing.customOffsets[posInGroup] || 0;
      swingOffset = (customOffsetPct / 100) * stepDurationSec * 0.5 * intensity + swingJitter;
    }
  }

  return { swingOffset, swingTime: time + swingOffset, posInGroup };
}
