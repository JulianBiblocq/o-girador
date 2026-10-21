import React from 'react';

interface SpeedTrainerStagesCountSelectorProps {
  lang: string;
  t: (key: string) => string;
  stagesCount: number;
  setStagesCount: (count: number) => void;
}

export const SpeedTrainerStagesCountSelector: React.FC<SpeedTrainerStagesCountSelectorProps> = ({
  lang,
  t,
  stagesCount,
  setStagesCount,
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#666]">
        ▪ {t('speedTrainerStagesCount')}
      </label>
      <div className="grid grid-cols-3 gap-1">
        {[2, 3, 4].map((count) => (
          <button
            key={count}
            type="button"
            onClick={() => setStagesCount(count)}
            className={`py-1.5 text-xs font-cactus font-bold border-2 border-[#1a1a1a] rounded-xs cursor-pointer shadow-[1px_1px_0px_#1a1a1a] ${
              stagesCount === count ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'bg-[#fcf9f2] text-[#1a1a1a] hover:bg-[#1a1a1a]/10'
            }`}
          >
            {count} {lang === 'fr' ? 'paliers' : 'etapas'}
          </button>
        ))}
      </div>
    </div>
  );
};
