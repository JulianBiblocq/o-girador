import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { HoldButton } from './HoldButton';
import { NumberInput } from './HoldNumberInput';

interface SpeedTrainerConsolidationControlProps {
  t: (key: string) => string;
  consolidationLaps: number;
  setConsolidationLaps: React.Dispatch<React.SetStateAction<number>>;
}

export const SpeedTrainerConsolidationControl: React.FC<SpeedTrainerConsolidationControlProps> = ({
  t,
  consolidationLaps,
  setConsolidationLaps,
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#666]">
          ▪ {t('speedTrainerConsolidationLaps')}
        </label>
        <span className="text-[10px] text-[#777]">{t('speedTrainerConsolidationHelp')}</span>
      </div>
      <div className="bg-[#fcf9f2] border-2 border-[#1a1a1a] p-2 rounded-xs shadow-[2px_2px_0px_#1a1a1a] flex items-center justify-between">
        <HoldButton
          onAction={() => setConsolidationLaps(prev => Math.max(1, prev - 1))}
          disabled={consolidationLaps <= 1}
          className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 rounded-xs font-bold cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5" />
        </HoldButton>
        <div className="text-center flex flex-col items-center">
          <NumberInput
            value={consolidationLaps}
            min={1}
            max={8}
            ariaLabel={t('speedTrainerConsolidationLaps')}
            onChange={(val) => setConsolidationLaps(Math.max(1, Math.min(8, val)))}
            className="w-16 text-center font-cactus font-bold text-xl tabular-nums leading-none bg-transparent"
          />
          <span className="text-[9px] font-bold text-[#888]">{t('speedTrainerLaps')}</span>
        </div>
        <HoldButton
          onAction={() => setConsolidationLaps(prev => Math.min(8, prev + 1))}
          disabled={consolidationLaps >= 8}
          className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 rounded-xs font-bold cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </HoldButton>
      </div>
    </div>
  );
};
