/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrainingStage } from '../types/trainings';

/**
 * Découpe un intervalle de BPM en paliers calibrés pour l'entraînement Mestre.
 * Garantit l'enchaînement strict sans rupture : pour tout palier k > 0,
 * stage[k].startBpm === stage[k-1].targetBpm.
 */
export function generateTrainingStages(
  startBpm: number,
  targetBpm: number,
  stagesCount: number,
  bpmStep: number,
  loopInterval: number,
  consolidationLaps: number
): TrainingStage[] {
  const delta = targetBpm - startBpm;
  const count = Math.max(1, Math.floor(stagesCount));

  if (delta <= 0 || count <= 1) {
    return [
      {
        stageIndex: 1,
        startBpm,
        targetBpm,
        bpmStep,
        loopInterval,
        consolidationLaps,
      },
    ];
  }

  const stages: TrainingStage[] = [];
  let currentStart = startBpm;

  for (let i = 1; i <= count; i++) {
    const isLast = i === count;
    const stageTarget = isLast
      ? targetBpm
      : Math.min(targetBpm, Math.max(currentStart, Math.round(startBpm + (delta * i) / count)));

    stages.push({
      stageIndex: i,
      startBpm: currentStart,
      targetBpm: stageTarget,
      bpmStep,
      loopInterval,
      consolidationLaps,
    });

    // Enchaînement strict sans rupture
    currentStart = stageTarget;
  }

  return stages;
}
