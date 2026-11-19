import React from 'react';
import { TimeSignature, Language } from '../../types';

export interface TimelineRulerControlsProps {
  mIdx: number;
  measureLabel: string;
  mTimeSig: TimeSignature;
  measureWidth: number;
  loopStartMeasure: number | null;
  loopEndMeasure: number | null;
  totalMeasures: number;
  lang: Language;
  onSetLoopStart: (mIdx: number) => void;
  onSetLoopEnd: (mIdx: number) => void;
  onMeasureTimeSigChange: (mIdx: number, sig: TimeSignature) => void;
  onInsertMeasure?: (mIdx: number, count: number) => void;
  onDeleteMeasure?: (mIdx: number) => void;
  confirmAsync: (msg: string) => Promise<boolean>;
  isMeasureSelected?: boolean;
  selectedHeaderMeasuresCount?: number;
  onDeleteMeasuresPrompt?: (mIdx: number) => void;
}

export const TimelineRulerControls = React.memo<TimelineRulerControlsProps>(({
  mIdx, measureLabel, mTimeSig, measureWidth, loopStartMeasure, loopEndMeasure,
  totalMeasures, lang, onSetLoopStart, onSetLoopEnd, onMeasureTimeSigChange,
  onInsertMeasure, onDeleteMeasure, confirmAsync, isMeasureSelected,
  selectedHeaderMeasuresCount, onDeleteMeasuresPrompt,
}) => {
  return (
    <div className="ruler-measure-header flex flex-wrap items-center justify-between w-full mt-0.5 gap-x-2 gap-y-1">
      <span className="font-cactus text-xs tracking-wide flex items-center gap-1.5 shrink-0 cursor-pointer">
        <span className="bg-[var(--cordel-text)]/5 hover:bg-[var(--cordel-text)]/15 px-1 py-0.5 rounded transition-colors font-bold">
          {measureLabel}
        </span>
        <div className="ruler-detailed flex gap-0.5 border-l border-[var(--cordel-border)]/20 pl-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onSetLoopStart(mIdx); }}
            className={`px-1 py-px rounded font-extrabold text-[10px] cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors border ${loopStartMeasure === mIdx ? 'bg-[var(--cordel-param-timing)] text-[var(--cordel-on-accent)] border-[var(--cordel-param-timing)]' : 'bg-transparent text-[var(--cordel-text)] border-[var(--cordel-border)]/30'}`}
          > [ </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSetLoopEnd(mIdx); }}
            className={`px-1 py-px rounded font-extrabold text-[10px] cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors border ${loopEndMeasure === mIdx ? 'bg-[var(--cordel-param-timing)] text-[var(--cordel-on-accent)] border-[var(--cordel-param-timing)]' : 'bg-transparent text-[var(--cordel-text)] border-[var(--cordel-border)]/30'}`}
          > ] </button>
        </div>
      </span>

      <div className="ruler-detailed">
        <select
          value={mTimeSig}
          onChange={(e) => onMeasureTimeSigChange(mIdx, e.target.value as TimeSignature)}
          className="bg-[var(--cordel-text)] text-[var(--cordel-bg)] text-[8px] font-bold rounded cordel-border-sm px-0.5 py-px outline-none cursor-pointer"
          title={lang === 'fr' ? 'Signature rythmique' : 'Assinatura de tempo'}
        >
          {(['4/4', '3/4', '2/4', '6/8', '9/8', '12/8'] as const).map((sig) => (
            <option key={sig} value={sig}>{sig}</option>
          ))}
        </select>
      </div>

      <div className={`flex items-center gap-1 shrink-0 ${measureWidth < 70 ? 'hidden group-hover:flex absolute inset-0 justify-center items-center bg-[var(--cordel-bg)]/85 z-20 pointer-events-none' : ''}`}>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onInsertMeasure?.(mIdx, 1); }}
          className="w-5 h-5 flex items-center justify-center text-xs font-bold bg-[var(--cordel-text)]/10 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] border border-[var(--cordel-border)]/40 rounded transition-colors cursor-pointer select-none pointer-events-auto shadow-xs"
          title={lang === 'fr' ? `Insérer une mesure avant M.${mIdx + 1}` : `Inserir compasso antes de C.${mIdx + 1}`}
        >
          +
        </button>
        <button
          type="button"
          disabled={totalMeasures <= 1}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={async (e) => {
            e.stopPropagation();
            if (totalMeasures <= 1) return;
            if (onDeleteMeasuresPrompt) {
              onDeleteMeasuresPrompt(mIdx);
            } else if (await confirmAsync(lang === 'fr' ? `Supprimer la mesure ${mIdx + 1} ?` : `Excluir o compasso ${mIdx + 1} ?`)) {
              onDeleteMeasure?.(mIdx);
            }
          }}
          className={`w-5 h-5 flex items-center justify-center text-xs font-bold border rounded transition-colors select-none pointer-events-auto shadow-xs ${
            totalMeasures <= 1
              ? 'opacity-30 cursor-not-allowed border-transparent bg-[var(--cordel-text)]/5'
              : (isMeasureSelected && selectedHeaderMeasuresCount && selectedHeaderMeasuresCount > 1)
                ? 'bg-[var(--cordel-gold)] hover:bg-[var(--cordel-status-danger)] text-[var(--cordel-ink-dark)] hover:text-[var(--cordel-on-accent)] border-[var(--cordel-ink-dark)] cursor-pointer shadow-[1px_1px_0px_var(--cordel-shadow-color)]'
                : 'bg-[var(--cordel-text)]/10 hover:bg-[var(--cordel-status-danger)] hover:text-[var(--cordel-on-accent)] border-[var(--cordel-border)]/40 cursor-pointer'
          }`}
          title={
            (isMeasureSelected && selectedHeaderMeasuresCount && selectedHeaderMeasuresCount > 1)
              ? (lang === 'fr' ? `Supprimer les ${selectedHeaderMeasuresCount} mesures sélectionnées` : `Excluir os ${selectedHeaderMeasuresCount} compassos selecionados`)
              : (lang === 'fr' ? `Supprimer la mesure ${mIdx + 1}` : `Excluir compasso ${mIdx + 1}`)
          }
        >
          ×
        </button>
      </div>
    </div>
  );
});
