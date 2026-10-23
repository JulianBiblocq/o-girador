/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SequencerStore } from '../types/sequencerStoreTypes';
import { SpeedTrainerBackup, SpeedTrainerConfig } from '../../types/speedTrainer.types';

export function calculateSpeedTrainerOpenConfig(state: SequencerStore): SpeedTrainerConfig {
  if (state.activeTrainingSession) {
    const session = state.activeTrainingSession;
    const maxM = Math.max(0, state.totalMeasures - 1);
    const clampedStart = Math.min(state.speedTrainerConfig?.startMeasure ?? 0, maxM);
    const clampedEnd = Math.min(Math.max(clampedStart, state.speedTrainerConfig?.endMeasure ?? 1), maxM);

    return {
      ...state.speedTrainerConfig,
      startMeasure: clampedStart,
      endMeasure: clampedEnd,
      startBpm: session.startBpm,
      targetBpm: session.targetBpm,
      consolidationLaps: session.consolidationLaps,
      trainingId: session.trainingId,
      stageIndex: session.stageIndex,
      stageTitle: session.title,
    };
  }

  if (state.hasCustomSpeedTrainerConfig && state.speedTrainerConfig) {
    const maxM = Math.max(0, state.totalMeasures - 1);
    const clampedStart = Math.min(state.speedTrainerConfig.startMeasure, maxM);
    const clampedEnd = Math.min(Math.max(clampedStart, state.speedTrainerConfig.endMeasure), maxM);

    return {
      ...state.speedTrainerConfig,
      startMeasure: clampedStart,
      endMeasure: clampedEnd,
    };
  }

  const targetBpm = state.bpm || 83;
  const startBpm = Math.max(40, targetBpm - 20);

  let startMeasure = 0;
  let endMeasure = Math.min(1, Math.max(0, state.totalMeasures - 1));

  if (state.isLoopRegionActive && state.loopStartMeasure !== null && state.loopEndMeasure !== null) {
    startMeasure = Math.min(state.loopStartMeasure, state.loopEndMeasure);
    endMeasure = Math.max(state.loopStartMeasure, state.loopEndMeasure);
  } else {
    startMeasure = state.currentMeasure || 0;
    endMeasure = Math.min(startMeasure + 1, Math.max(0, state.totalMeasures - 1));
  }

  return {
    startMeasure,
    endMeasure,
    startBpm,
    targetBpm,
    bpmStep: state.speedTrainerConfig?.bpmStep || 2,
    loopInterval: state.speedTrainerConfig?.loopInterval || 1,
  };
}

export function buildSpeedTrainerBackup(state: SequencerStore): SpeedTrainerBackup {
  return {
    originalBpm: state.bpm,
    originalLoopMode: state.loopMode,
    originalLoopStart: state.loopStartMeasure,
    originalLoopEnd: state.loopEndMeasure,
    originalIsLoopActive: state.isLoopRegionActive,
  };
}
