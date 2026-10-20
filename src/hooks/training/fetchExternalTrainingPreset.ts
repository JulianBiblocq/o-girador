/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getTrainingById } from '../../services/cloudTrainings';
import { TrainingProgram } from '../../types/trainings';
import { getCloudPreset } from '../../cloudLibrary';

interface FetchPresetParams {
  trainingId: string | null;
  presetId: string | null;
  alertAsync?: (msg: string) => Promise<void>;
  audio: any;
}

export async function fetchExternalTrainingPreset({
  trainingId,
  presetId,
  alertAsync,
  audio,
}: FetchPresetParams): Promise<TrainingProgram | null> {
  let training: TrainingProgram | null = null;
  if (trainingId) {
    training = await getTrainingById(trainingId);
    if (!training && alertAsync) {
      await alertAsync("Le programme d'entraînement demandé est introuvable ou a été supprimé.");
    }
  }

  const targetPresetId = presetId || training?.presetId;
  if (targetPresetId) {
    const cleanPresetId = targetPresetId.replace(/^cloud:/, '');
    let presetData = await getCloudPreset(cleanPresetId);
    if (!presetData) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      presetData = await getCloudPreset(cleanPresetId);
    }
    if (presetData) {
      audio.setActivePresetName(`cloud:${cleanPresetId}`);
      await audio.applyPreset(presetData);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  return training;
}
