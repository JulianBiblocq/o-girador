import React from 'react';
import { TrainingStage } from '../../types/trainings';

interface SpeedTrainerStagesPreviewProps {
  t: (key: string) => string;
  calculatedStages: TrainingStage[];
  consolidationLaps: number;
  targetBpm: number;
}

export const SpeedTrainerStagesPreview: React.FC<SpeedTrainerStagesPreviewProps> = ({
  t,
  calculatedStages,
  consolidationLaps,
  targetBpm,
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#666]">
        ▪ {t('speedTrainerPreviewTitle')}
      </label>
      <div className="bg-[#fcf9f2] border-2 border-[#1a1a1a] p-2.5 rounded-xs shadow-[2px_2px_0px_#1a1a1a] flex flex-col gap-1.5">
        {calculatedStages.map((stg) => (
          <div
            key={stg.stageIndex}
            className="flex items-center justify-between text-xs font-mono py-1 px-2 border-b border-[#1a1a1a]/15 last:border-b-0 bg-[#f4ecd8]/60 rounded-xs"
          >
            <span className="font-bold font-cactus text-sm text-[#1a1a1a]">
              {t('speedTrainerStage')} {stg.stageIndex}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-900 bg-amber-500/20 px-1.5 py-0.5 rounded-xs border border-amber-600/30">
                {stg.startBpm} {stg.targetBpm} BPM
              </span>
              <span className="text-[10px] text-[#666]">
                (+{stg.bpmStep} / {stg.loopInterval === 1 ? t('speedTrainerLoopsInterval') : t('speedTrainerLoopsIntervalPlural')})
              </span>
            </div>
          </div>
        ))}
        <div className="text-[10px] text-[#555] font-sans font-bold flex items-center justify-between pt-1 border-t border-[#1a1a1a]/20">
          <span>▪ {t('speedTrainerMaintenance')}</span>
          <span className="text-[#8b2a1a]">{consolidationLaps} {t('speedTrainerLaps')} @ {targetBpm} BPM</span>
        </div>
      </div>
    </div>
  );
};
