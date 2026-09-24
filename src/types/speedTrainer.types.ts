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
  consolidationLaps?: number; // Tours à tenir au targetBpm avant validation (default: 2)
  trainingId?: string;  // ID du programme Firestore si lancé depuis un défi
  stageIndex?: number;  // Numéro du palier (1, 2, 3...)
  stageTitle?: string;  // Nom du défi / palier
}

export interface SpeedTrainerBackup {
  originalBpm: number;
  originalLoopMode: 'infinite' | number;
  originalLoopStart: number | null;
  originalLoopEnd: number | null;
  originalIsLoopActive: boolean;
}

export interface ActiveTrainingSession {
  trainingId: string;
  stageIndex: number;
  consolidationLaps: number;
  title?: string;
  targetBpm: number;
  startBpm: number;
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
  activeTrainingSession: ActiveTrainingSession | null;

  openSpeedTrainerModal: () => void;
  closeSpeedTrainerModal: () => void;
  setSpeedTrainerConfig: (config: SpeedTrainerConfig) => void;
  resetSpeedTrainerConfig: () => void;
  startSpeedTrainer: (config: SpeedTrainerConfig) => void;
  stopSpeedTrainer: () => void;
  setSpeedTrainerTourCount: (count: number | ((prev: number) => number)) => void;
  setSpeedTrainerCurrentBpm: (bpm: number | ((prev: number) => number)) => void;
  setSpeedTrainerCountdown: (count: number | null) => void;
  setActiveTrainingSession: (session: ActiveTrainingSession | null) => void;
}
