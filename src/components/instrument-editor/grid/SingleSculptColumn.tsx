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
  onClick,
}) => {
  return (
    <div
      className={`flex flex-col gap-[2px] cursor-pointer rounded-xs p-[1px] transition-all ${
        isFocusedSub ? 'bg-[var(--cordel-wood)]/20 ring-1 ring-[var(--cordel-wood)]' : 'hover:bg-[var(--cordel-ink-dark)]/10'
      }`}
      onClick={onClick}
      title={title}
    >
      <div className="h-[2px] bg-[var(--cordel-ink-dark)]/10 w-full relative">
        <div className="h-full bg-[var(--cordel-param-volume)] transition-all" style={{ width: `${vol}%` }} />
      </div>
      <div className="h-[2px] bg-[var(--cordel-ink-dark)]/10 w-full relative">
        <div className="h-full bg-[var(--cordel-param-decay)] transition-all" style={{ width: `${decay}%` }} />
      </div>
      <div className="h-[3px] bg-[var(--cordel-ink-dark)]/15 w-full relative overflow-hidden">
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[var(--cordel-ink-dark)]/30" />
        {shift !== 0 && (
          <div
            className="absolute top-0 bottom-0 bg-[var(--cordel-param-timing)] transition-all"
            style={{
              left: shift > 0 ? '50%' : 'auto',
              right: shift < 0 ? '50%' : 'auto',
              width: `${Math.min(50, Math.abs(shift) / 2)}%`,
            }}
          />
        )}
      </div>
    </div>
  );
};
