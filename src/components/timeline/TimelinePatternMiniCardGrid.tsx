import React from 'react';
import { Pattern } from '../../types';
import { isDarkText, getVisualStrokeSymbol, NEWTON_NOTE_COLORS } from '../../data';

interface TimelinePatternMiniCardGridProps {
  pattern: Pattern;
  inst: any;
  isVoice: boolean;
  isLeftHanded: boolean;
  currentPreviewStep: number | null;
}

export const TimelinePatternMiniCardGrid: React.FC<TimelinePatternMiniCardGridProps> = ({
  pattern,
  inst,
  isVoice,
  isLeftHanded,
  currentPreviewStep,
}) => {
  const totalSteps = pattern.steps || 16;

  return (
    <div className="bg-[#1a1a1a]/5 p-1 border border-[#1a1a1a]/20 rounded-none mb-2">
      <div className="flex h-5 w-full gap-[1px]">
        {Array.from({ length: totalSteps }).map((_, sIdx) => {
          const val = pattern.activeSteps?.[sIdx];
          const hasNote = val !== 0 && val !== '' && val !== undefined && val !== '0';
          const isPlayingThisStep = currentPreviewStep === sIdx;

          let bg = 'transparent';
          let borderCol = '#1a1a1a20';
          let txt = '';
          let txtCol = '#1a1a1a';

          if (hasNote) {
            if (isVoice) {
              const note = (pattern.notes?.[sIdx] || '').trim();
              const noteLetter = note ? note.charAt(0).toUpperCase() : '';
              bg = noteLetter ? (NEWTON_NOTE_COLORS[noteLetter as keyof typeof NEWTON_NOTE_COLORS] || '#2a9d8f') : '#2a9d8f';
              txt = (pattern.lyrics?.[sIdx] || noteLetter || String(val)).slice(0, 2);
              txtCol = '#fff';
            } else {
              const visual = getVisualStrokeSymbol(val as any, isLeftHanded, inst?.id);
              const prim = Array.isArray(visual) ? visual[0] : visual;
              bg = inst?.colors?.[prim as string] || inst?.color || '#3b82f6';
              txt = String(prim);
              txtCol = isDarkText(inst?.id, String(Array.isArray(val) ? val[0] : val)) ? '#1a1a1a' : '#f4ecd8';
            }
          }

          return (
            <div
              key={sIdx}
              className={`flex-1 h-full flex items-center justify-center text-[7px] font-sans font-bold select-none transition-all ${
                isPlayingThisStep
                  ? 'ring-1 ring-amber-500 scale-110 z-10 brightness-125 shadow-sm'
                  : ''
              } ${sIdx % 4 === 0 && sIdx > 0 ? 'border-l border-[#1a1a1a]/40' : ''}`}
              style={{
                backgroundColor: bg,
                borderColor: borderCol,
                color: txtCol,
              }}
            >
              {txt}
            </div>
          );
        })}
      </div>
    </div>
  );
};
