/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSequencerStore } from '../../stores/useSequencerStore';
import { TrainingProgram } from '../../types/trainings';
import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { ViewMode } from '../useViewRouter';
import { resolveTrackForRole } from './resolveTrackForRole';

interface ArmTrainingParams {
  pendingTrainingProgram: TrainingProgram | null;
  pendingStage: string | null;
  pendingTrainingId: string | null;
  pendingTocarJunto: boolean;
  pendingRole: string | null;
  pendingBaseOnly: boolean;
  changeViewMode: (mode: ViewMode) => void;
  cleanTrainingUrlParams: () => void;
}

export function executeArmTrainingSession({
  pendingTrainingProgram,
  pendingStage,
  pendingTrainingId,
  pendingTocarJunto,
  pendingRole,
  pendingBaseOnly,
  changeViewMode,
  cleanTrainingUrlParams,
}: ArmTrainingParams): boolean {
  const store = useSequencerStore.getState();
  const currentTracks = store.tracks;
  if (!currentTracks || currentTracks.length === 0) return false;

  changeViewMode('roda');

  if (pendingTrainingProgram && pendingTrainingProgram.stages && pendingTrainingProgram.stages.length > 0) {
    const totalMeasures = store.totalMeasures || 1;
    const targetStageIndex = pendingStage ? parseInt(pendingStage, 10) : 1;
    const stage = pendingTrainingProgram.stages.find((s) => s.stageIndex === targetStageIndex) || pendingTrainingProgram.stages[0];

    if (stage) {
      const maxMeasure = Math.max(0, totalMeasures - 1);
      const startMeasure = Math.min(pendingTrainingProgram.startMeasure ?? 0, maxMeasure);
      const rawEnd = pendingTrainingProgram.endMeasure !== undefined ? pendingTrainingProgram.endMeasure : maxMeasure;
      const endMeasure = Math.min(Math.max(startMeasure, rawEnd), maxMeasure);
      const consolidationLaps = stage.consolidationLaps || pendingTrainingProgram.consolidationLaps || 2;
      const effectiveTrainingId = pendingTrainingProgram.id || pendingTrainingId || '';

      store.setActiveTrainingSession({
        trainingId: effectiveTrainingId,
        stageIndex: stage.stageIndex,
        consolidationLaps,
        title: pendingTrainingProgram.title || 'Entraînement',
        startBpm: stage.startBpm,
        targetBpm: stage.targetBpm,
      });

      store.setSpeedTrainerConfig({
        startMeasure,
        endMeasure,
        startBpm: stage.startBpm,
        targetBpm: stage.targetBpm,
        bpmStep: stage.bpmStep ?? 2,
        loopInterval: stage.loopInterval ?? 1,
        consolidationLaps,
        trainingId: effectiveTrainingId,
        stageIndex: stage.stageIndex,
        stageTitle: pendingTrainingProgram.title,
      });

      store.openSpeedTrainerModal();
    }
  }

  if (pendingTocarJunto) {
    let targetTrack: TrackGroup | undefined;
    if (pendingRole) {
      targetTrack = resolveTrackForRole(currentTracks, pendingRole);
    }
    if (!targetTrack) {
      targetTrack =
        currentTracks.find((t) => !t.isBusFolder && instrumentsConfig[t.instrumentIdx]?.type !== 'voice') ||
        currentTracks[0];
    }
    if (targetTrack) {
      store.setTocarJuntoTrack(targetTrack.id, pendingBaseOnly);
      store.setActiveAoVivoTrackId(targetTrack.id);
      if (store.isEcoMode) store.toggleEcoMode();

      const trackDisplayName =
        (targetTrack as any).name ||
        targetTrack.customName ||
        instrumentsConfig[targetTrack.instrumentIdx]?.name ||
        'Piste';
      console.log('🎯 [TOCAR JUNTO SUCCÈS] Mode armé pour la piste :', trackDisplayName, '(ID:', targetTrack.id, ')');

      cleanTrainingUrlParams();
      return true;
    }
  }

  if (pendingTrainingId) {
    cleanTrainingUrlParams();
    return true;
  }

  return false;
}
