import React from 'react';
import { Pattern } from '../../types';
import { Check, Mic } from 'lucide-react';

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
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(undefined); }}
          onClick={() => onSelect(undefined)}
          style={isFollowingMaster ? { backgroundColor: '#1a1a1a', color: '#f4ecd8' } : { backgroundColor: '#f4ecd8', color: '#1a1a1a' }}
          className={`w-full text-left px-2 py-1.5 rounded-none font-bold text-xs flex items-center justify-between transition-colors cursor-pointer ${
            isFollowingMaster ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'hover:bg-[#e6dac3] text-[#1a1a1a]'
          }`}
        >
          <span className="truncate" style={{ color: isFollowingMaster ? '#f4ecd8' : '#1a1a1a' }}>
            {lang === 'fr' ? 'Suivre le maître' : 'Seguir mestre'}
          </span>
          {isFollowingMaster && <Check size={12} className="shrink-0 ml-1" style={{ color: '#f4ecd8' }} />}
        </button>
      )}

      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(null); }}
        onClick={() => onSelect(null)}
        style={activePatternId === null && !isFollowingMaster ? { backgroundColor: '#1a1a1a', color: '#f4ecd8' } : { backgroundColor: '#f4ecd8', color: '#1a1a1a' }}
        className={`w-full text-left px-2 py-1.5 rounded-none font-bold text-xs flex items-center justify-between transition-colors cursor-pointer ${
          activePatternId === null && !isFollowingMaster ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'hover:bg-[#e6dac3] text-[#1a1a1a]'
        }`}
      >
        <span className="truncate" style={{ color: activePatternId === null && !isFollowingMaster ? '#f4ecd8' : '#1a1a1a' }}>
          — {lang === 'fr' ? 'Silence' : 'Silêncio'}
        </span>
        {activePatternId === null && !isFollowingMaster && <Check size={12} className="shrink-0 ml-1" style={{ color: '#f4ecd8' }} />}
      </button>

      {patternsList.map((p, idx) => {
        const isCurrent = !isFollowingMaster && (activePatternId !== null && activePatternId !== undefined && String(activePatternId) === String(p.id));
        return (
          <button
            key={p.id}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(p.id); }}
            onClick={() => onSelect(p.id)}
            style={isCurrent ? { backgroundColor: '#1a1a1a', color: '#f4ecd8' } : { backgroundColor: '#f4ecd8', color: '#1a1a1a' }}
            className={`w-full text-left px-2 py-1.5 rounded-none font-bold text-xs flex items-center justify-between transition-colors cursor-pointer ${
              isCurrent ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'hover:bg-[#e6dac3] text-[#1a1a1a]'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: instColor }}
              />
              <span className="truncate flex items-center gap-1">
                {p.vocalMode === 'micro' && <Mic size={10} className="shrink-0 text-[#8b2a1a]" />}
                <span style={{ color: isCurrent ? '#f4ecd8' : '#1a1a1a' }}>
                  {p.name || `${lang === 'fr' ? 'Motif' : 'Padrão'} ${idx + 1}`}
                </span>
              </span>
            </div>
            {isCurrent && <Check size={12} className="shrink-0 ml-1" style={{ color: '#f4ecd8' }} />}
          </button>
        );
      })}
    </div>
  );
};
