import React from 'react';
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
    <div className="flex flex-col gap-4 bg-[#eaddcf]/50 p-3 border border-black/15 rounded-sm">
      <div className="flex justify-between items-center mb-1">
        <span className="font-bold text-[10px] uppercase text-[#1a1a1a]">
          {lang === 'fr' ? 'Micro-timing des 4 doubles croches' : 'Micro-timing das 4 semicolcheias'}
        </span>
        {activeMode === 'custom' && (
          <button
            type="button"
            onClick={onResetCustom}
            className="px-2 py-0.5 bg-white border border-black text-[9px] font-bold hover:bg-black hover:text-white transition-colors cursor-pointer"
          >
            {lang === 'fr' ? 'Réinitialiser' : 'Redefinir'}
          </button>
        )}
      </div>

      <div className="flex gap-2 justify-around w-full">
        {customOffsets.map((offset, idx) => (
          <div key={idx} className="flex flex-col items-center gap-2 flex-1">
            <div className="relative w-full h-12 flex items-center justify-center">
              <div className="absolute top-0 bottom-0 left-1/2 w-0 border-l border-dashed border-black/20 -translate-x-1/2 z-0" />
              <div
                className="flex items-center justify-center bg-[#f4ecd8] border border-black shadow-[1.5px_1.5px_0px_#000] z-10 w-8 h-8 font-cactus font-black text-xs transition-transform duration-100"
                style={{ transform: `translateX(${(offset / 100) * 16}px)` }}
              >
                {idx + 1}
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
                className="w-full h-1.5 bg-black/20 rounded-full appearance-none cursor-pointer outline-none slider-horizontal accent-[#8b2a1a] disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="text-center font-bold text-[10px] text-[#1a1a1a]">
              {offset > 0 ? `+${offset}%` : `${offset}%`}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[9px] opacity-75 text-center leading-tight">
        {lang === 'fr'
          ? 'Axe central = pulsation stricte. Droite : Retard (+). Gauche : Anticipation / Avance (-).'
          : 'Eixo central = pulso estrito. Direita: Atraso (+). Esquerda: Antecipação / Avanço (-).'}
      </p>
    </div>
  );
};
