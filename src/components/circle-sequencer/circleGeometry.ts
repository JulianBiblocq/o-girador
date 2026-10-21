/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MIN_RADIUS, MAX_RADIUS } from './circleSequencerConstants';

export const getTrackRadius = (visibleIdx: number, totalTracks: number): number => {
  if (totalTracks <= 0) return 0;
  if (totalTracks === 1) return MAX_RADIUS - 35;
  if (totalTracks === 2) {
    return visibleIdx === 0 ? MAX_RADIUS - 105 : MAX_RADIUS - 35;
  }
  const gap = (MAX_RADIUS - MIN_RADIUS) / (totalTracks - 1);
  return MIN_RADIUS + visibleIdx * gap;
};

export const resolveBeatsFromTimeSig = (sigStr: string, patSteps: number): number => {
  let resolvedBeats = parseInt(sigStr.split('/')[0], 10) || 4;
  if (sigStr === '2/4' || sigStr === '6/8' || patSteps <= 8) {
    resolvedBeats = 2;
  } else if (sigStr === '3/4' || sigStr === '9/8' || patSteps === 12) {
    resolvedBeats = 3;
  } else if (sigStr === '12/8') {
    resolvedBeats = 4;
  }
  return resolvedBeats;
};

export const computeStepAngles = (
  resolvedBeats: number,
  beatResolutions?: number[]
): number[] => {
  const beatRes = beatResolutions?.slice(0, resolvedBeats) || Array(resolvedBeats).fill(4);
  const anglePerBeat = (Math.PI * 2) / resolvedBeats;
  const stepAngles: number[] = [];

  for (let b = 0; b < resolvedBeats; b++) {
    const res = beatRes[b] || 4;
    const anglePerStep = anglePerBeat / res;
    const beatStartAngle = -Math.PI / 2 + (b * anglePerBeat);
    for (let s = 0; s < res; s++) {
      stepAngles.push(beatStartAngle + s * anglePerStep);
    }
  }

  return stepAngles;
};
