import React from 'react';
import { Pattern } from '../../types';
import { Check } from 'lucide-react';

interface TimelinePatternPickerListProps {
  patternsList: Pattern[];
  activePatternId: number | null | undefined;
  isSlave: boolean;
  isFollowingMaster: boolean;
  instColor: string;
  lang: string;
  onSelect: (patternId: number | null | undefined) => void;
}

export const TimelinePatternPickerList: React.FC<TimelinePatternPickerListProps> = ({
  patternsList,
  activePatternId,
  isSlave,
  isFollowingMaster,
  instColor,
  lang,
  onSelect,
}) => {
  return (
    <div className="flex flex-col gap-1 max-h-[240px] overflow-y-auto px-1 py-1">
      {isSlave && (
        <button
          type="button"
          onClick={() => onSelect(undefined)}
          className={`w-full text-left px-2 py-1.5 rounded-none font-bold text-xs flex items-center justify-between transition-colors cursor-pointer ${
            isFollowingMaster
              ? 'bg-[#1a1a1a] text-[#f4ecd8]'
              : 'hover:bg-[#1a1a1a]/10 text-[var(--cordel-text)]'
          }`}
        >
          <span className="truncate">{lang === 'fr' ? 'Suivre le maître' : 'Seguir mestre'}</span>
          {isFollowingMaster && <Check size={12} className="shrink-0 ml-1" />}
        </button>
      )}

      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`w-full text-left px-2 py-1.5 rounded-none font-bold text-xs flex items-center justify-between transition-colors cursor-pointer ${
          activePatternId === null && !isFollowingMaster
            ? 'bg-[#1a1a1a] text-[#f4ecd8]'
            : 'hover:bg-[#1a1a1a]/10 text-[var(--cordel-text)]/70'
        }`}
      >
        <span className="truncate">— {lang === 'fr' ? 'Silence' : 'Silêncio'}</span>
        {activePatternId === null && !isFollowingMaster && <Check size={12} className="shrink-0 ml-1" />}
      </button>

      {patternsList.map((p, idx) => {
        const isCurrent = !isFollowingMaster && activePatternId === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className={`w-full text-left px-2 py-1.5 rounded-none font-bold text-xs flex items-center justify-between transition-colors cursor-pointer ${
              isCurrent
                ? 'bg-[#1a1a1a] text-[#f4ecd8]'
                : 'hover:bg-[#1a1a1a]/10 text-[var(--cordel-text)]'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: instColor }}
              />
              <span className="truncate">
                {p.vocalMode === 'micro' ? '' : ''}
                {p.name || `${lang === 'fr' ? 'Motif' : 'Padrão'} ${idx + 1}`}
              </span>
            </div>
            {isCurrent && <Check size={12} className="shrink-0 ml-1" />}
          </button>
        );
      })}
    </div>
  );
};
