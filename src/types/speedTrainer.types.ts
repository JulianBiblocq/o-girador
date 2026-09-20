/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SpeedTrainerConfig {
  startMeasure: number; // 0-indexed in memory, 1-indexed in UI
  endMeasure: number;   // 0-indexed in memory, 1-indexed in UI
  startBpm: number;
  targetBpm: number;
  bpmStep: number;      // 1, 2, or 4 (default: 2)
  loopInterval: number; // 1 = each tour, 2 = every 2 tours (default: 1)
}

export interface SpeedTrainerBackup {
  originalBpm: number;
  originalLoopMode: 'infinite' | number;
  originalLoopStart: number | null;
  originalLoopEnd: number | null;
  originalIsLoopActive: boolean;
}

export interface SpeedTrainerSlice {
  isSpeedTrainerOpen: boolean;
  isSpeedTrainerActive: boolean;
  hasCustomSpeedTrainerConfig: boolean;
  speedTrainerConfig: SpeedTrainerConfig;
  speedTrainerBackup: SpeedTrainerBackup | null;
  speedTrainerTourCount: number;
  speedTrainerCurrentBpm: number;
  speedTrainerCountdown: number | null;

  openSpeedTrainerModal: () => void;
  closeSpeedTrainerModal: () => void;
  setSpeedTrainerConfig: (config: SpeedTrainerConfig) => void;
  resetSpeedTrainerConfig: () => void;
  startSpeedTrainer: (config: SpeedTrainerConfig) => void;
  stopSpeedTrainer: () => void;
  setSpeedTrainerTourCount: (count: number | ((prev: number) => number)) => void;
  setSpeedTrainerCurrentBpm: (bpm: number | ((prev: number) => number)) => void;
  setSpeedTrainerCountdown: (count: number | null) => void;
}
