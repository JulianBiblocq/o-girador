/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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

  track.patterns.forEach((p) => {
    const vols = p.volumes || [];
    const decays = p.decays || [];
    p.activeSteps.forEach((step, idx) => {
      if (step === stroke) {
        const v = vols[idx];
        volSum += v !== undefined ? (Array.isArray(v) ? v[0] : v) : 80;
        volCount++;
        const d = decays[idx];
        decaySum += d !== undefined ? (Array.isArray(d) ? d[0] : d) : defaultDecay;
        decayCount++;
      }
    });
    p.variations?.forEach((v) => {
      const varVols = v.volumes || [];
      const varDecays = v.decays || [];
      v.steps.forEach((step, idx) => {
        if (step === stroke) {
          const vv = varVols[idx];
          volSum += vv !== undefined ? (Array.isArray(vv) ? vv[0] : vv) : 80;
          volCount++;
          const vd = varDecays[idx];
          decaySum += vd !== undefined ? (Array.isArray(vd) ? vd[0] : vd) : defaultDecay;
          decayCount++;
        }
      });
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
