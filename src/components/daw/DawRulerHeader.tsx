import React from 'react';
import { CompassoSelector } from '../CompassoSelector';
import { useSequencerStore } from '../../stores/useSequencerStore';

interface DawRulerHeaderProps {
  defaultBeats: number;
  lang: string;
}

export const DawRulerHeader: React.FC<DawRulerHeaderProps> = ({ defaultBeats, lang }) => {
  return (
    <div className="flex items-center w-full h-auto pb-2.5 shrink-0 border-b border-[#333] mb-4 select-none justify-start px-3">
      <div className="w-[360px] min-w-[360px] shrink-0 flex items-center gap-3 pr-3">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            useSequencerStore.getState().toggleTracksCollapsed();
          }}
          className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-button px-3 py-2 text-sm font-extrabold cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors flex-shrink-0 flex items-center justify-center"
          title={lang === 'fr' ? 'Replier le séquenceur' : 'Recolher sequenciador'}
        >
          ▲
        </button>
        <CompassoSelector className="flex-grow max-w-[240px]" />
      </div>

      <div className="flex items-center justify-between flex-grow pl-4 select-none">
        <div className="flex w-full items-center gap-1.5 text-[#1a1a1a] font-cactus font-bold text-[10px] md:text-xs">
          {Array.from({ length: defaultBeats }).map((_, beatIdx) => {
            const isEvenBeat = beatIdx % 2 === 0;
            const emptyStepBg = isEvenBeat ? '#f4ecd8' : '#d2c5b1';
            return (
              <div
                key={beatIdx}
                className="flex-1 text-center py-1.5 rounded-none border-[1.5px] border-[#1a1a1a] dark:border-black shadow-[1px_1px_0px_#1a1a1a] dark:shadow-[1px_1px_0px_rgba(0,0,0,0.8)]"
                style={{ backgroundColor: emptyStepBg }}
              >
                T{beatIdx + 1}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
