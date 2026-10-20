import * as Tone from 'tone';
import confetti from 'canvas-confetti';
import { auth } from '../../firebase/config';
import { recordStageSuccess } from '../../services/cloudTrainings';
import { useSequencerStore } from '../../stores/useSequencerStore';

interface HandleSpeedTrainerLapProps {
  nextTour: number;
  speedTrainerCurrentBpmRef: React.MutableRefObject<number>;
  speedTrainerConsolidationLapsDoneRef: React.MutableRefObject<number>;
  handleStop: () => void;
}

export function handleSpeedTrainerLap({
  nextTour,
  speedTrainerCurrentBpmRef,
  speedTrainerConsolidationLapsDoneRef,
  handleStop,
}: HandleSpeedTrainerLapProps): boolean {
  const stState = useSequencerStore.getState();
  if (!stState.isSpeedTrainerActive || !stState.speedTrainerConfig) {
    return false;
  }

  const curBpm = speedTrainerCurrentBpmRef.current || stState.speedTrainerConfig.startBpm;
  const targetBpm = stState.speedTrainerConfig.targetBpm;

  if (curBpm < targetBpm) {
    if (nextTour % stState.speedTrainerConfig.loopInterval === 0) {
      const nextBpm = Math.min(curBpm + stState.speedTrainerConfig.bpmStep, targetBpm);
      speedTrainerCurrentBpmRef.current = nextBpm;
      Tone.Transport.bpm.value = nextBpm;
      stState.setSpeedTrainerCurrentBpm(nextBpm);
    }
  } else {
    speedTrainerConsolidationLapsDoneRef.current++;
    const requiredLaps = stState.speedTrainerConfig.consolidationLaps ?? 2;

    if (speedTrainerConsolidationLapsDoneRef.current >= requiredLaps) {
      const completedConfig = stState.speedTrainerConfig;

      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          zIndex: 9999,
        });
      } catch (_) {}

      const currentUid = auth.currentUser?.uid;
      if (currentUid && completedConfig.trainingId && completedConfig.stageIndex !== undefined) {
        recordStageSuccess(currentUid, completedConfig.trainingId, completedConfig.stageIndex);
      }

      stState.stopSpeedTrainer();
      handleStop();

      window.dispatchEvent(
        new CustomEvent('o-girador-stage-completed', {
          detail: {
            trainingId: completedConfig.trainingId,
            stageIndex: completedConfig.stageIndex,
            stageTitle: completedConfig.stageTitle,
            targetBpm: completedConfig.targetBpm,
          },
        })
      );
      return true;
    }
  }
  return false;
}
