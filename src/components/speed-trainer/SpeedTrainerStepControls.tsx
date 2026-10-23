import React from 'react';

interface SpeedTrainerStepControlsProps {
  t: (key: string) => string;
  bpmStep: number;
  setBpmStep: (step: number) => void;
  loopInterval: number;
  setLoopInterval: (interval: number) => void;
}

export const SpeedTrainerStepControls: React.FC<SpeedTrainerStepControlsProps> = ({
  t,
  bpmStep,
  setBpmStep,
  loopInterval,
  setLoopInterval,
}) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="flex flex-col gap-1.5">
        <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#666]">
          • {t('speedTrainerStep')}
        </label>
        <div className="grid grid-cols-3 gap-1">
          {[1, 2, 4].map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setBpmStep(step)}
              className={`py-1.5 text-xs font-cactus font-bold border-2 border-[#1a1a1a] rounded-xs cursor-pointer shadow-[1px_1px_0px_#1a1a1a] ${
                bpmStep === step ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'bg-[#fcf9f2] text-[#1a1a1a] hover:bg-[#1a1a1a]/10'
              }`}
            >
              +{step}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#666]">
          • {t('speedTrainerInterval')}
        </label>
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setLoopInterval(1)}
            className={`py-1.5 px-1 text-[11px] font-cactus font-bold border-2 border-[#1a1a1a] rounded-xs cursor-pointer shadow-[1px_1px_0px_#1a1a1a] ${
              loopInterval === 1 ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'bg-[#fcf9f2] text-[#1a1a1a] hover:bg-[#1a1a1a]/10'
            }`}
          >
            {t('speedTrainerEveryLoop')}
          </button>
          <button
            type="button"
            onClick={() => setLoopInterval(2)}
            className={`py-1.5 px-1 text-[11px] font-cactus font-bold border-2 border-[#1a1a1a] rounded-xs cursor-pointer shadow-[1px_1px_0px_#1a1a1a] ${
              loopInterval === 2 ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'bg-[#fcf9f2] text-[#1a1a1a] hover:bg-[#1a1a1a]/10'
            }`}
          >
            {t('speedTrainerEvery2Loops')}
          </button>
        </div>
      </div>
    </div>
  );
};
