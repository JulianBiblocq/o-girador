import React from 'react';
import { AVAILABLE_INSTRUMENTS, t } from './wizardConstants';
import { Language } from '../../types';

interface WizardInstrumentsRackProps {
  wizardLang: Language;
  hasToada: boolean;
  onToggleToada: () => void;
  onPalettePointerDown: (e: React.PointerEvent<HTMLDivElement>, type: string) => void;
}

export const WizardInstrumentsRack: React.FC<WizardInstrumentsRackProps> = ({
  wizardLang,
  hasToada,
  onToggleToada,
  onPalettePointerDown,
}) => {
  return (
    <div className="flex-shrink-0 flex flex-col gap-3 md:w-52 min-h-0">
      <div
        onClick={onToggleToada}
        className="flex items-center gap-3 p-3 bg-[#f4ecd8] border-3 border-[#1a1a1a] shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-[0.98] transition-all cursor-pointer rounded-sm select-none"
      >
        <div className="w-6 h-6 border-2 border-[#1a1a1a] flex items-center justify-center font-cactus text-lg font-bold bg-[#ece4d0] text-[#8b2a1a] select-none shrink-0">
          {hasToada ? '✕' : ''}
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a] leading-tight">
            {t[wizardLang].inclureChant}
          </span>
          <span className="text-[8px] text-[#1a1a1a]/60 leading-none">
            {t[wizardLang].activerToada}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible md:overflow-y-auto p-2 bg-[#1a1a1a]/5 border-2 border-dashed border-[#1a1a1a]/20 rounded-sm scrollbar-thin">
        <div className="hidden md:block text-[10px] uppercase font-bold text-[#1a1a1a]/60 pb-1 border-b border-[#1a1a1a]/10 mb-1">
          {t[wizardLang].instrumentsGlissables}
        </div>
        {AVAILABLE_INSTRUMENTS.map((inst) => (
          <div
            key={inst.id}
            onPointerDown={(e) => onPalettePointerDown(e, inst.id)}
            className="flex-shrink-0 flex md:flex-row flex-col items-center gap-1.5 md:gap-3 p-2 bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-grab select-none rounded-sm text-center md:text-left touch-none group md:w-full min-w-[70px] md:min-w-0"
            style={{ borderColor: inst.color }}
          >
            <img
              src={inst.iconImg}
              className="w-7 h-7 object-contain group-hover:scale-110 duration-200 pointer-events-none p-0.5 rounded-full bg-[#1a1a1a]/5"
              style={{ border: `2px solid ${inst.color}` }}
              alt=""
            />
            <div className="flex flex-col">
              <span className="text-[9px] font-cactus font-bold uppercase text-[#1a1a1a] leading-none">
                {inst.label}
              </span>
              <span className="hidden md:inline text-[7px] text-[#1a1a1a]/60 leading-none mt-0.5">
                {inst.id === 'marcante' || inst.id === 'meiao' || inst.id === 'repique' ? 'Alfaia' : 'Percussion'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
