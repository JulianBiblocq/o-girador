import React from 'react';
import { Language } from '../../types';

interface BalancoCaptureMetronomeBarProps {
  lang: Language;
  leftLedRef: React.RefObject<HTMLDivElement | null>;
  rightLedRef: React.RefObject<HTMLDivElement | null>;
  railTrackRef: React.RefObject<HTMLDivElement | null>;
  cursorRef: React.RefObject<HTMLDivElement | null>;
}

export const BalancoCaptureMetronomeBar: React.FC<BalancoCaptureMetronomeBarProps> = ({
  lang,
  leftLedRef,
  rightLedRef,
  railTrackRef,
  cursorRef,
}) => {
  return (
    <div className="w-full bg-[#2a1d15] border-2 border-black shadow-[3px_3px_0px_#000] p-2 rounded-sm flex flex-col gap-1.5 text-[#f4ecd8]">
      <div className="flex justify-between items-center text-[10px] font-bold px-1 uppercase tracking-wider text-[#d5c3b0]">
        <div className="flex items-center gap-1.5">
          <span className="text-[#22c55e] font-black">● 1</span>
          <span className="opacity-50 text-[9px]">(3)</span>
        </div>
        <span className="font-cactus text-xs tracking-widest text-[#f4ecd8]/70">
          ⚡ {lang === 'fr' ? 'BALANCIEZ AU TEMPO' : 'BALANCEIE NO TEMPO'}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="opacity-50 text-[9px]">(4)</span>
          <span className="text-[#eab308] font-black">2 ●</span>
        </div>
      </div>

      <div className="relative w-full h-7 bg-[#1c130d] border border-black/60 rounded-sm flex items-center px-1">
        <div
          ref={leftLedRef}
          className="w-4 h-4 rounded-full border border-black/50 bg-[#3a2e22] opacity-60 flex items-center justify-center font-cactus text-[9px] font-black text-white shrink-0 z-10 select-none"
        >
          1
        </div>

        <div ref={railTrackRef} className="relative flex-1 h-full mx-1.5 flex items-center overflow-hidden">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#3a2e22] border-b border-white/5" />
          <div className="absolute left-1/2 top-1 bottom-1 w-[1px] bg-white/15 -translate-x-1/2" />
          <div className="absolute left-1/4 top-2 bottom-2 w-[1px] bg-white/10 -translate-x-1/2" />
          <div className="absolute left-3/4 top-2 bottom-2 w-[1px] bg-white/10 -translate-x-1/2" />
          <div
            ref={cursorRef}
            className="absolute top-0.5 bottom-0.5 w-1.5 bg-[#22c55e] shadow-[0_0_8px_#22c55e] rounded-full -translate-x-1/2 will-change-transform z-20 pointer-events-none"
          />
        </div>

        <div
          ref={rightLedRef}
          className="w-4 h-4 rounded-full border border-black/50 bg-[#3a2e22] opacity-60 flex items-center justify-center font-cactus text-[9px] font-black text-white shrink-0 z-10 select-none"
        >
          2
        </div>
      </div>
    </div>
  );
};
