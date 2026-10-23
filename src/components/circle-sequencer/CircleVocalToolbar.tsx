/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface CircleVocalToolbarProps {
  isLetraActive: boolean;
  toggleLetraActive: () => void;
  vocalMode: 'voice' | 'synth' | 'both';
  setVocalMode: (mode: 'voice' | 'synth' | 'both') => void;
  lang?: string;
}

export const CircleVocalToolbar: React.FC<CircleVocalToolbarProps> = ({
  isLetraActive,
  toggleLetraActive,
  vocalMode,
  setVocalMode,
  lang,
}) => {
  if (!isLetraActive) return null;

  return (
    <div
      className="absolute bottom-2 md:bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 md:gap-2 bg-[var(--cordel-bg)]/95 border-2 border-[var(--cordel-border)] rounded-md px-2.5 py-1 md:px-3 md:py-1.5 shadow-[3px_3px_0px_var(--cordel-border)] select-none backdrop-blur-xs"
      role="toolbar"
      aria-label={lang === 'pt' ? 'Controles vocais da Roda' : 'Contrôles vocaux de la Roda'}
    >
      <button
        type="button"
        onClick={toggleLetraActive}
        className={`flex items-center gap-1.5 px-2 py-0.5 md:px-2.5 md:py-1 rounded text-[11px] md:text-xs font-bold font-sans transition-all cursor-pointer border border-[var(--cordel-border)] active:scale-95 ${
          isLetraActive
            ? 'bg-[#c25e38] text-white shadow-[1px_1px_0px_var(--cordel-border)]'
            : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[#e8dec5]'
        }`}
        title={lang === 'pt' ? 'Fechar Letra da Toada' : 'Fermer la Letra de la toada'}
      >
        <span className="text-xs md:text-sm"></span>
        <span>Letra</span>
        <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isLetraActive ? 'bg-amber-300 animate-pulse' : 'bg-stone-400'}`} />
      </button>

      <div className="w-[1px] h-3.5 md:h-4 bg-[var(--cordel-border)]/30 mx-0.5" />

      <div className="flex items-center border border-[var(--cordel-border)] rounded overflow-hidden bg-[#e8dec5]/50">
        <button
          type="button"
          onClick={() => setVocalMode('voice')}
          className={`px-1.5 md:px-2 py-0.5 md:py-1 text-[11px] md:text-xs font-bold transition-all cursor-pointer ${
            vocalMode === 'voice'
              ? 'bg-[var(--cordel-border)] text-[var(--cordel-bg)]'
              : 'text-[var(--cordel-text)] hover:bg-[var(--cordel-border)]/10'
          }`}
          title={lang === 'pt' ? 'Voz gravada (sample áudio puro)' : 'Voix enregistrée (échantillon audio)'}
        >
          
        </button>
        <button
          type="button"
          onClick={() => setVocalMode('synth')}
          className={`px-1.5 md:px-2 py-0.5 md:py-1 text-[11px] md:text-xs font-bold border-l border-r border-[var(--cordel-border)] transition-all cursor-pointer ${
            vocalMode === 'synth'
              ? 'bg-[var(--cordel-border)] text-[var(--cordel-bg)]'
              : 'text-[var(--cordel-text)] hover:bg-[var(--cordel-border)]/10'
          }`}
          title={lang === 'pt' ? 'Sintetizador melódico (notas MIDI)' : 'Synthétiseur de notes mélodiques'}
        >
          
        </button>
        <button
          type="button"
          onClick={() => setVocalMode('both')}
          className={`px-1.5 md:px-2 py-0.5 md:py-1 text-[11px] md:text-xs font-bold transition-all cursor-pointer ${
            vocalMode === 'both'
              ? 'bg-[var(--cordel-border)] text-[var(--cordel-bg)]'
              : 'text-[var(--cordel-text)] hover:bg-[var(--cordel-border)]/10'
          }`}
          title={lang === 'pt' ? 'Voz gravada + Sintetizador simultâneos' : 'Voix enregistrée + Synthétiseur simultanés'}
        >
          +
        </button>
      </div>
    </div>
  );
};
