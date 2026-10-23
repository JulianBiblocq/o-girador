/**
 * Barre de décalage groupé (nudge) et pré-écoute du Balanço (< 55 lignes).
 */

import React from 'react';
import { Zap, Play, Square } from 'lucide-react';
import { Language } from '../../types';

interface Props {
  lang: Language;
  isPreviewPlaying: boolean;
  onNudgeGroup: (delta: number) => void;
  onTogglePreview: () => void;
}

export const BalancoCustomNudgeBar: React.FC<Props> = ({
  lang,
  isPreviewPlaying,
  onNudgeGroup,
  onTogglePreview,
}) => {
  return (
    <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/10 flex-wrap">
      <div className="flex items-center gap-1.5">
        <span className="font-bold text-[10px] uppercase text-[#1a1a1a] flex items-center gap-1">
          <Zap size={11} className="text-[#8b2a1a]" />
          <span>{lang === 'fr' ? 'Nudge Groupé :' : 'Nudge em Bloco :'}</span>
        </span>
        <div className="flex gap-1">
          {[-5, -1, 1, 5].map((delta) => (
            <button
              key={delta}
              type="button"
              onClick={() => onNudgeGroup(delta)}
              className="px-2 py-0.5 bg-white border border-black text-[10px] font-bold text-[#1a1a1a] hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000]"
            >
              {delta > 0 ? `+${delta}%` : `${delta}%`}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onTogglePreview}
        className={`px-2.5 py-1 text-xs font-bold border border-black cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5 transition-all ${
          isPreviewPlaying
            ? 'bg-[#8b2a1a] text-[#f4ecd8] animate-pulse ring-1 ring-[#8b2a1a]'
            : 'bg-white text-[#1a1a1a] hover:bg-black hover:text-white'
        }`}
      >
        {isPreviewPlaying ? <Square size={11} fill="currentColor" /> : <Play size={11} fill="currentColor" />}
        <span>{lang === 'fr' ? (isPreviewPlaying ? 'Arrêter' : 'Tester le groove') : isPreviewPlaying ? 'Parar' : 'Testar o groove'}</span>
      </button>
    </div>
  );
};
