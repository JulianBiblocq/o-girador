/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TrainingStage {
  stageIndex: number;         // 1, 2, 3...
  startBpm: number;
  targetBpm: number;
  bpmStep: number;            // 1, 2 ou 4
  loopInterval: number;       // 1 ou 2 tours
  consolidationLaps: number;  // Tours à tenir au targetBpm avant validation
}

export interface TrainingProgram {
  id?: string;
  presetId: string;
  presetName: string;
  groupId: string;
  mestreId: string;
  title: string;              // Nom de l'entraînement (ex. "Virada - Luanda")
  startMeasure: number;       // Base 0
  endMeasure: number;         // Base 0
  stagesCount: number;
  consolidationLaps: number;
  stages: TrainingStage[];
  createdAt: number;
}
