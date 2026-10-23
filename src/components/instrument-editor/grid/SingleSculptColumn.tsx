
import React from 'react';

interface SingleSculptColumnProps {
  vol: number;
  decay: number;
  shift: number;
  isFocusedSub?: boolean;
  title: string;
  onClick: (e: React.MouseEvent) => void;
}

export const SingleSculptColumn: React.FC<SingleSculptColumnProps> = ({
  vol,
  decay,
  shift,
  isFocusedSub,
  title,
  onClick
}) => {
  return (
    <div
      className={`flex flex-col gap-[2px] cursor-pointer rounded-xs p-[1px] transition-all ${
        isFocusedSub ? 'bg-[#8b2a1a]/20 ring-1 ring-[#8b2a1a]' : 'hover:bg-black/10'
      }`}
      onClick={onClick}
      title={title}
    >
      <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
        <div className="h-full bg-green-600 transition-all" style={{ width: `${vol}%` }} />
      </div>
      <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
        <div className="h-full bg-amber-500 transition-all" style={{ width: `${decay}%` }} />
      </div>
      <div className="h-[3px] bg-[#1a1a1a]/15 w-full relative overflow-hidden">
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#1a1a1a]/30" />
        {shift !== 0 && (
          <div
            className="absolute top-0 bottom-0 bg-[#2980b9] transition-all"
            style={{
              left: shift > 0 ? '50%' : 'auto',
              right: shift < 0 ? '50%' : 'auto',
              width: `${Math.min(50, Math.abs(shift) / 2)}%`
            }}
          />
        )}
      </div>
    </div>
  );
};
