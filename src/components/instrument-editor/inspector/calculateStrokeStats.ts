
import { Track } from '../../../types';

export function calculateStrokeStats(
  track: Track | undefined,
  stroke: string,
  isVoice: boolean,
  strokeDefaults: Record<string, { volume?: number; decay?: number }>
): { avgVolume: number; avgDecay: number } {
  const defaultDecay = isVoice ? 10 : 100;
  if (!track) return { avgVolume: 80, avgDecay: defaultDecay };

  let volSum = 0;
  let volCount = 0;
  let decaySum = 0;
  let decayCount = 0;

  const recordStepStats = (step: any, idx: number, vols: any[], decays: any[]) => {
    const v = vols[idx];
    const d = decays[idx];
    if (Array.isArray(step)) {
      if (step[0] === stroke) {
        volSum += v !== undefined ? (Array.isArray(v) ? v[0] : v) : 80;
        volCount++;
        decaySum += d !== undefined ? (Array.isArray(d) ? d[0] : d) : defaultDecay;
        decayCount++;
      }
      if (step[1] === stroke) {
        volSum += v !== undefined ? (Array.isArray(v) ? v[1] : v) : 80;
        volCount++;
        decaySum += d !== undefined ? (Array.isArray(d) ? d[1] : d) : defaultDecay;
        decayCount++;
      }
    } else if (step === stroke) {
      volSum += v !== undefined ? (Array.isArray(v) ? v[0] : v) : 80;
      volCount++;
      decaySum += d !== undefined ? (Array.isArray(d) ? d[0] : d) : defaultDecay;
      decayCount++;
    }
  };

  track.patterns.forEach((p) => {
    const vols = p.volumes || [];
    const decays = p.decays || [];
    p.activeSteps.forEach((step, idx) => recordStepStats(step, idx, vols, decays));
    p.variations?.forEach((v) => {
      const varVols = v.volumes || [];
      const varDecays = v.decays || [];
      v.steps.forEach((step, idx) => recordStepStats(step, idx, varVols, varDecays));
    });
  });

  if (volCount > 0 && decayCount > 0) {
    return {
      avgVolume: Math.round(volSum / volCount),
      avgDecay: Math.round(decaySum / decayCount),
    };
  }

  const defaults = strokeDefaults[`${track.id}:${stroke}`];
  return {
    avgVolume: defaults?.volume !== undefined ? defaults.volume : 80,
    avgDecay: defaults?.decay !== undefined ? defaults.decay : defaultDecay,
  };
}
