import React from 'react';
import { SpeedTrainerBpmControls } from './SpeedTrainerBpmControls';
import { SpeedTrainerStepControls } from './SpeedTrainerStepControls';

interface SpeedTrainerTempoSelectionProps {
  t: (key: string) => string;
  startBpm: number;
  targetBpm: number;
  setStartBpm: React.Dispatch<React.SetStateAction<number>>;
  setTargetBpm: React.Dispatch<React.SetStateAction<number>>;
  bpmStep: number;
  setBpmStep: (step: number) => void;
  loopInterval: number;
  setLoopInterval: (interval: number) => void;
}

export const SpeedTrainerTempoSelection: React.FC<SpeedTrainerTempoSelectionProps> = ({
  t,
  startBpm,
  targetBpm,
  setStartBpm,
  setTargetBpm,
  bpmStep,
  setBpmStep,
  loopInterval,
  setLoopInterval,
}) => {
  return (
    <>
      <SpeedTrainerBpmControls
        t={t}
        startBpm={startBpm}
        targetBpm={targetBpm}
        setStartBpm={setStartBpm}
        setTargetBpm={setTargetBpm}
      />
      <SpeedTrainerStepControls
        t={t}
        bpmStep={bpmStep}
        setBpmStep={setBpmStep}
        loopInterval={loopInterval}
        setLoopInterval={setLoopInterval}
      />
    </>
  );
};
