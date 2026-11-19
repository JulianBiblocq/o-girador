/**
 * O Girador - Vocal Step Matching At Specific Tick
 */

export function matchVocalStepAtTick(
  tick: number,
  beatResolutions: number[] | undefined | null,
  beatsPerMeasure: number,
  totalTicks: number,
  bpm: number
): { localCell: number; singleStepSec: number; stepsInBeat: number } | null {
  const beats = Math.max(1, Math.round(beatsPerMeasure) || 4);
  const ticksPerBeat = totalTicks / beats;
  const isCompoundBeat = Math.abs(ticksPerBeat - 36) < 1e-3;
  const defaultSub = isCompoundBeat ? 3 : 4;
  const safeBpm = isNaN(bpm) || bpm <= 0 ? 100 : bpm;
  const beatDurationSec = isCompoundBeat ? 90 / safeBpm : 60 / safeBpm;

  const resArray = Array.isArray(beatResolutions) && beatResolutions.length >= beats
    ? beatResolutions
    : null;

  if (!resArray) {
    const defaultSteps = beats * defaultSub;
    const ticksPerStep = totalTicks / defaultSteps;
    if (tick % ticksPerStep === 0) {
      const localCell = Math.floor(tick / ticksPerStep);
      const singleStepSec = beatDurationSec / defaultSub;
      return { localCell, singleStepSec, stepsInBeat: defaultSub };
    }
    return null;
  }

  let accumulatedStep = 0;
  for (let b = 0; b < beats; b++) {
    const res = resArray[b] > 0 ? resArray[b] : defaultSub;
    const ticksPerStep = ticksPerBeat / res;
    const beatStartTick = Math.round(b * ticksPerBeat);
    const beatEndTick = Math.round((b + 1) * ticksPerBeat);

    if (tick >= beatStartTick && tick < beatEndTick) {
      for (let r = 0; r < res; r++) {
        const stepTick = Math.round(beatStartTick + r * ticksPerStep);
        if (tick === stepTick) {
          const singleStepSec = beatDurationSec / res;
          return {
            localCell: accumulatedStep + r,
            singleStepSec,
            stepsInBeat: res,
          };
        }
      }
      return null;
    }
    accumulatedStep += res;
  }

  return null;
}
