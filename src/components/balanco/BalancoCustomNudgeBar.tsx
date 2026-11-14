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
    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--cordel-border)] flex-wrap">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="font-bold text-[10px] uppercase text-[var(--cordel-text)] flex items-center gap-1">
          <Zap size={11} className="text-[var(--cordel-accent-readable)] shrink-0" />
          <span>{lang === 'fr' ? 'Nudge Groupé :' : 'Nudge em Bloco :'}</span>
        </span>
        <div className="flex gap-1">
          {[-5, -1, 1, 5].map((delta) => (
            <button
              key={delta}
              type="button"
              onClick={() => onNudgeGroup(delta)}
              className="px-2 py-0.5 bg-[var(--cordel-card-btn-bg)] border border-[var(--cordel-card-btn-border)] text-[10px] font-bold text-[var(--cordel-card-btn-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] transition-colors cursor-pointer shadow-[1px_1px_0px_var(--cordel-shadow-color)]"
            >
              {delta > 0 ? `+${delta}%` : `${delta}%`}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onTogglePreview}
        className={`px-2.5 py-1 text-xs font-bold border cursor-pointer shadow-[1.5px_1.5px_0px_var(--cordel-shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5 transition-colors ${
          isPreviewPlaying
            ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)] animate-pulse'
            : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-card-btn-border)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]'
        }`}
      >
        {isPreviewPlaying ? <Square size={11} fill="currentColor" /> : <Play size={11} fill="currentColor" />}
        <span>
          {lang === 'fr'
            ? isPreviewPlaying ? 'Arrêter' : 'Tester le groove'
            : isPreviewPlaying ? 'Parar' : 'Testar o groove'}
        </span>
      </button>
    </div>
  );
};
