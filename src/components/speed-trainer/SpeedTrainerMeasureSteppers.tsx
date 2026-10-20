import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { HoldButton } from './HoldButton';
import { NumberInput } from './HoldNumberInput';

interface SpeedTrainerMeasureSteppersProps {
  t: (key: string) => string;
  startMeasure: number;
  endMeasure: number;
  setStartMeasure: React.Dispatch<React.SetStateAction<number>>;
  setEndMeasure: React.Dispatch<React.SetStateAction<number>>;
  totalMeasures: number;
  setSelectedSectionMarkerId: (id: string) => void;
}

export const SpeedTrainerMeasureSteppers: React.FC<SpeedTrainerMeasureSteppersProps> = ({
  t,
  startMeasure,
  endMeasure,
  setStartMeasure,
  setEndMeasure,
  totalMeasures,
  setSelectedSectionMarkerId,
}) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="bg-[#fcf9f2] border-2 border-[#1a1a1a] p-2 rounded-xs shadow-[2px_2px_0px_#1a1a1a] flex flex-col gap-1">
        <span className="text-[10px] text-[#666] font-bold uppercase">{t('speedTrainerFrom')}</span>
        <div className="flex items-center justify-between">
          <HoldButton
            onAction={() => { setStartMeasure(prev => Math.max(0, prev - 1)); setSelectedSectionMarkerId(''); }}
            disabled={startMeasure <= 0}
            className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 rounded-xs font-bold cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </HoldButton>
          <NumberInput
            value={startMeasure + 1}
            min={1}
            max={totalMeasures}
            ariaLabel={t('speedTrainerFrom')}
            onChange={(val) => {
              const newStart = val - 1;
              setStartMeasure(newStart);
              setSelectedSectionMarkerId('');
              if (newStart > endMeasure) setEndMeasure(newStart);
            }}
            className="w-14 text-center font-cactus font-bold text-xl tabular-nums bg-transparent"
          />
          <HoldButton
            onAction={() => {
              setStartMeasure(prev => {
                const next = Math.min(totalMeasures - 1, prev + 1);
                if (next > endMeasure) setEndMeasure(next);
                return next;
              });
              setSelectedSectionMarkerId('');
            }}
            disabled={startMeasure >= totalMeasures - 1}
            className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 rounded-xs font-bold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </HoldButton>
        </div>
      </div>

      <div className="bg-[#fcf9f2] border-2 border-[#1a1a1a] p-2 rounded-xs shadow-[2px_2px_0px_#1a1a1a] flex flex-col gap-1">
        <span className="text-[10px] text-[#666] font-bold uppercase">{t('speedTrainerTo')}</span>
        <div className="flex items-center justify-between">
          <HoldButton
            onAction={() => {
              setEndMeasure(prev => {
                const next = Math.max(0, prev - 1);
                if (next < startMeasure) setStartMeasure(next);
                return next;
              });
              setSelectedSectionMarkerId('');
            }}
            disabled={endMeasure <= 0}
            className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 rounded-xs font-bold cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </HoldButton>
          <NumberInput
            value={endMeasure + 1}
            min={1}
            max={totalMeasures}
            ariaLabel={t('speedTrainerTo')}
            onChange={(val) => {
              const newEnd = val - 1;
              setEndMeasure(newEnd);
              setSelectedSectionMarkerId('');
              if (newEnd < startMeasure) setStartMeasure(newEnd);
            }}
            className="w-14 text-center font-cactus font-bold text-xl tabular-nums bg-transparent"
          />
          <HoldButton
            onAction={() => { setEndMeasure(prev => Math.min(totalMeasures - 1, prev + 1)); setSelectedSectionMarkerId(''); }}
            disabled={endMeasure >= totalMeasures - 1}
            className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 rounded-xs font-bold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </HoldButton>
        </div>
      </div>
    </div>
  );
};
