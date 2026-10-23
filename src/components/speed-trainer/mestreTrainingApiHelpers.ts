/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrainingProgram } from '../../types/trainings';
import { saveTrainingProgram, updateTrainingProgram, deleteTrainingProgram } from '../../services/cloudTrainings';

export interface SaveTrainingParams {
  editingTrainingId: string | null;
  challengeTitle: string;
  defaultChallengeTitle: string;
  startMeasure: number;
  endMeasure: number;
  stagesCount: number;
  consolidationLaps: number;
  freshStages: any[];
  resolvedPresetId: string;
  presetName: string;
  effectiveGroupId: string;
  mestreId: string;
}

export async function executeSaveMestreTraining(params: SaveTrainingParams): Promise<void> {
  const title = params.challengeTitle.trim() || params.defaultChallengeTitle;
  if (params.editingTrainingId) {
    await updateTrainingProgram(params.editingTrainingId, {
      title,
      startMeasure: params.startMeasure,
      endMeasure: params.endMeasure,
      stagesCount: params.stagesCount,
      consolidationLaps: params.consolidationLaps,
      stages: params.freshStages,
    });
  } else {
    await saveTrainingProgram({
      presetId: params.resolvedPresetId,
      presetName: params.presetName,
      groupId: params.effectiveGroupId,
      mestreId: params.mestreId,
      title,
      startMeasure: params.startMeasure,
      endMeasure: params.endMeasure,
      stagesCount: params.stagesCount,
      consolidationLaps: params.consolidationLaps,
      stages: params.freshStages,
      createdAt: Date.now(),
    });
  }
}

export async function executeDeleteMestreTraining(trainingId: string): Promise<void> {
  await deleteTrainingProgram(trainingId);
}
