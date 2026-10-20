import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { HoldButton } from './HoldButton';
import { NumberInput } from './HoldNumberInput';

interface SpeedTrainerBpmControlsProps {
  t: (key: string) => string;
  startBpm: number;
  targetBpm: number;
  setStartBpm: React.Dispatch<React.SetStateAction<number>>;
  setTargetBpm: React.Dispatch<React.SetStateAction<number>>;
}

export const SpeedTrainerBpmControls: React.FC<SpeedTrainerBpmControlsProps> = ({
  t,
  startBpm,
  targetBpm,
  setStartBpm,
  setTargetBpm,
}) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="flex flex-col gap-1.5">
        <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#666]">
          🐢 {t('speedTrainerStartBpm')}
        </label>
        <div className="bg-[#fcf9f2] border-2 border-[#1a1a1a] p-2 rounded-xs shadow-[2px_2px_0px_#1a1a1a] flex items-center justify-between">
          <HoldButton
            onAction={() => setStartBpm(prev => Math.max(40, prev - 1))}
            disabled={startBpm <= 40}
            className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 rounded-xs font-bold cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </HoldButton>
          <div className="text-center flex flex-col items-center">
            <NumberInput
              value={startBpm}
              min={40}
              max={240}
              ariaLabel={t('speedTrainerStartBpm')}
              onChange={(val) => {
                setStartBpm(val);
                if (val > targetBpm) setTargetBpm(val);
              }}
              className="w-16 text-center font-cactus font-bold text-xl tabular-nums leading-none bg-transparent"
            />
            <span className="text-[9px] font-bold text-[#888]">BPM</span>
          </div>
          <HoldButton
            onAction={() => {
              setStartBpm(prev => {
                const next = Math.min(240, prev + 1);
                if (next > targetBpm) setTargetBpm(next);
                return next;
              });
            }}
            disabled={startBpm >= 240}
            className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 rounded-xs font-bold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </HoldButton>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#666]">
          🎯 {t('speedTrainerTargetBpm')}
        </label>
        <div className="bg-[#fcf9f2] border-2 border-[#1a1a1a] p-2 rounded-xs shadow-[2px_2px_0px_#1a1a1a] flex items-center justify-between">
          <HoldButton
            onAction={() => {
              setTargetBpm(prev => {
                const next = Math.max(40, prev - 1);
                if (next < startBpm) setStartBpm(next);
                return next;
              });
            }}
            disabled={targetBpm <= 40}
            className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 rounded-xs font-bold cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </HoldButton>
          <div className="text-center flex flex-col items-center">
            <NumberInput
              value={targetBpm}
              min={40}
              max={240}
              ariaLabel={t('speedTrainerTargetBpm')}
              onChange={(val) => {
                setTargetBpm(val);
                if (val < startBpm) setStartBpm(val);
              }}
              className="w-16 text-center font-cactus font-bold text-xl tabular-nums leading-none bg-transparent"
            />
            <span className="text-[9px] font-bold text-[#888]">BPM</span>
          </div>
          <HoldButton
            onAction={() => setTargetBpm(prev => Math.min(240, prev + 1))}
            disabled={targetBpm >= 240}
            className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 rounded-xs font-bold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </HoldButton>
        </div>
      </div>
    </div>
  );
};
