import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Language } from '../../types';

interface BalancoStepSlidersProps {
  customOffsets: [number, number, number, number];
  activeMode: 'maracatu' | 'custom';
  lang: Language;
  onOffsetChange: (index: number, val: number) => void;
  onResetCustom: () => void;
}

export const BalancoStepSliders: React.FC<BalancoStepSlidersProps> = ({
  customOffsets,
  activeMode,
  lang,
  onOffsetChange,
  onResetCustom,
}) => {
  return (
    <div className="flex flex-col gap-3 bg-[var(--cordel-surface)] p-3 border border-[var(--cordel-border)] rounded-sm text-[var(--cordel-text)]">
      <div className="flex justify-between items-center gap-2">
        <span className="font-bold text-[10px] uppercase text-[var(--cordel-text)]">
          {lang === 'fr' ? 'ADN Micro-timing des 4 doubles-croches (P1–P4)' : 'DNA Micro-timing das 4 semicolcheias (P1–P4)'}
        </span>
        {activeMode === 'custom' && (
          <button
            type="button"
            onClick={onResetCustom}
            className="px-2 py-0.5 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border border-[var(--cordel-card-btn-border)] text-[9px] font-bold hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] transition-colors cursor-pointer flex items-center gap-1"
          >
            <RotateCcw size={10} className="shrink-0" />
            <span>{lang === 'fr' ? 'Réinitialiser' : 'Redefinir'}</span>
          </button>
        )}
      </div>

      <div className="flex gap-2 justify-around w-full">
        {customOffsets.map((rawOffset, idx) => {
          const offset = rawOffset ?? 0;
          return (
            <div key={idx} className="flex flex-col items-center gap-2 flex-1 min-w-0">
              <div className="relative w-full h-11 flex items-center justify-center bg-[var(--cordel-surface-muted)] border border-[var(--cordel-border)] rounded-xs overflow-hidden">
                <div className="absolute top-0 bottom-0 left-1/2 w-0 border-l border-dashed border-[var(--cordel-border)] -translate-x-1/2 z-0" />
                <div
                  className="flex items-center justify-center bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border border-[var(--cordel-border-strong)] shadow-[1.5px_1.5px_0px_var(--cordel-shadow-color)] z-10 w-7 h-7 font-cactus font-black text-xs transition-transform duration-100 will-change-transform"
                  style={{ transform: `translateX(${(offset / 100) * 16}px)` }}
                >
                  P{idx + 1}
                </div>
              </div>

              <div className="w-full relative flex items-center">
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={offset}
                  disabled={activeMode !== 'custom'}
                  onChange={(e) => onOffsetChange(idx, parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-[var(--cordel-surface-muted)] rounded-full appearance-none cursor-pointer outline-none accent-[var(--cordel-wood)] disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="text-center font-mono font-bold text-[10px] text-[var(--cordel-accent-readable)]">
                {offset > 0 ? `+${offset}%` : `${offset}%`}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[9px] text-[var(--cordel-text-muted)] font-semibold text-center leading-tight">
        {lang === 'fr'
          ? 'Axe central = pulsation stricte. Droite : Retard (+). Gauche : Anticipation / Avance (-).'
          : 'Eixo central = pulso estrito. Direita: Atraso (+). Esquerda: Antecipação / Avanço (-).'}
      </p>
    </div>
  );
};
