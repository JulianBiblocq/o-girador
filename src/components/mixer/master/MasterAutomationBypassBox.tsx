/**
 * Boîte de débrayage (bypass) des automations sur la tranche Master (< 90 lignes).
 */
import React from 'react';
import { useSequencerStore } from '../../../stores/useSequencerStore';

interface MasterAutomationBypassBoxProps {
  lang: string;
}

export const MasterAutomationBypassBox: React.FC<MasterAutomationBypassBoxProps> = ({ lang }) => {
  const globalBypass = useSequencerStore(state => state.globalAutomationBypass);
  const toggleGlobal = useSequencerStore(state => state.toggleGlobalAutomationBypass);

  const isAllBypassed = !!globalBypass?.all;
  const isVolBypassed = isAllBypassed || !!globalBypass?.volume;
  const isPanBypassed = isAllBypassed || !!globalBypass?.pan;
  const isRevBypassed = isAllBypassed || !!globalBypass?.reverb;

  return (
    <div className="flex flex-col gap-1 p-1.5 rounded-[2px] bg-[var(--cordel-bg)]/80 border border-[var(--cordel-border)]/40 w-full text-[var(--cordel-text)] select-none shrink-0">
      <div className="flex items-center justify-between gap-1">
        <span className="font-cactus font-bold text-[9px] uppercase tracking-wider text-[var(--cordel-text)]/70">
          Automations
        </span>
        <button
          type="button"
          onClick={() => toggleGlobal('all')}
          className={`px-1.5 py-0.5 rounded-[2px] font-cactus font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer ${
            !isAllBypassed
              ? 'bg-[var(--cordel-wood)] text-[var(--cordel-parchment-bg)] border border-[var(--cordel-border)] hover:opacity-90 shadow-xs'
              : 'opacity-50 line-through bg-black/40 text-gray-400 border border-dashed border-gray-600'
          }`}
          title={
            lang === 'pt'
              ? (isAllBypassed ? 'Reativar todas as automações' : 'Desativar todas as automações')
              : (isAllBypassed ? 'Rembrayer toutes les automations' : 'Débrayer toutes les automations')
          }
        >
          AUTO : {!isAllBypassed ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1">
        <button
          type="button"
          onClick={() => toggleGlobal('volume')}
          className={`py-0.5 rounded-[2px] font-cactus font-bold text-[8.5px] uppercase transition-all cursor-pointer text-center ${
            !isVolBypassed
              ? 'bg-[var(--cordel-wood)]/85 text-[var(--cordel-parchment-bg)] border border-[var(--cordel-border)] hover:bg-[var(--cordel-wood)]'
              : 'opacity-45 line-through bg-black/40 text-gray-400 border border-dashed border-gray-600'
          }`}
          title={lang === 'pt' ? 'Automações de Volume' : 'Automations de Volume'}
        >
          VOL
        </button>
        <button
          type="button"
          onClick={() => toggleGlobal('pan')}
          className={`py-0.5 rounded-[2px] font-cactus font-bold text-[8.5px] uppercase transition-all cursor-pointer text-center ${
            !isPanBypassed
              ? 'bg-[var(--cordel-wood)]/85 text-[var(--cordel-parchment-bg)] border border-[var(--cordel-border)] hover:bg-[var(--cordel-wood)]'
              : 'opacity-45 line-through bg-black/40 text-gray-400 border border-dashed border-gray-600'
          }`}
          title={lang === 'pt' ? 'Automações de Panorâmico' : 'Automations de Panoramique'}
        >
          PAN
        </button>
        <button
          type="button"
          onClick={() => toggleGlobal('reverb')}
          className={`py-0.5 rounded-[2px] font-cactus font-bold text-[8.5px] uppercase transition-all cursor-pointer text-center ${
            !isRevBypassed
              ? 'bg-[var(--cordel-wood)]/85 text-[var(--cordel-parchment-bg)] border border-[var(--cordel-border)] hover:bg-[var(--cordel-wood)]'
              : 'opacity-45 line-through bg-black/40 text-gray-400 border border-dashed border-gray-600'
          }`}
          title={lang === 'pt' ? 'Automações de Reverb' : 'Automations de Réverbe'}
        >
          REV
        </button>
      </div>
    </div>
  );
};
