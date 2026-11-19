import React, { useSyncExternalStore } from 'react';
import { Mic, Music, Layers } from 'lucide-react';
import {
  getIsFocusBalancoDrawerOpen,
  subscribeFocusBalancoDrawer,
} from '../../audio/groove/liveBalancoMorph';

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
  const isBalancoDrawerOpen = useSyncExternalStore(
    subscribeFocusBalancoDrawer,
    getIsFocusBalancoDrawerOpen,
    getIsFocusBalancoDrawerOpen
  );

  if (!isLetraActive) return null;

  const placementClass = isBalancoDrawerOpen
    ? 'bottom-2 right-2.5 left-auto translate-x-0 scale-95 origin-bottom-right'
    : 'bottom-2 md:bottom-3 left-1/2 -translate-x-1/2';

  return (
    <div
      className={`absolute ${placementClass} z-30 flex items-center gap-1.5 md:gap-2 bg-[var(--cordel-bg)]/95 border-2 border-[var(--cordel-border)] rounded-md px-2.5 py-1 md:px-3 md:py-1.5 shadow-[3px_3px_0px_var(--cordel-border)] select-none backdrop-blur-xs transition-transform`}
      role="toolbar"
      aria-label={lang === 'pt' ? 'Controles vocais da Roda' : 'Contrôles vocaux de la Roda'}
    >
      <button
        type="button"
        onClick={toggleLetraActive}
        className={`flex items-center gap-1.5 px-2 py-0.5 md:px-2.5 md:py-1 rounded text-[11px] md:text-xs font-bold font-sans transition-all cursor-pointer border border-[var(--cordel-border)] active:scale-95 ${
          isLetraActive
            ? 'bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] shadow-[1px_1px_0px_var(--cordel-border)]'
            : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-parchment-panel)]'
        }`}
        title={lang === 'pt' ? 'Fechar Letra da Toada' : 'Fermer la Letra de la toada'}
      >
        <span>Letra</span>
        <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isLetraActive ? 'bg-[var(--cordel-gold)] animate-pulse' : 'bg-[var(--cordel-text-muted)]'}`} />
      </button>

      <div className="w-[1px] h-3.5 md:h-4 bg-[var(--cordel-border)]/30 mx-0.5" />

      <div className="flex items-center border border-[var(--cordel-border)] rounded overflow-hidden bg-[var(--cordel-parchment-panel)]/50">
        <button
          type="button"
          onClick={() => setVocalMode('voice')}
          className={`px-1.5 md:px-2 py-0.5 md:py-1 text-[11px] md:text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
            vocalMode === 'voice'
              ? 'bg-[var(--cordel-border)] text-[var(--cordel-bg)]'
              : 'text-[var(--cordel-text)] hover:bg-[var(--cordel-border)]/10'
          }`}
          title={lang === 'pt' ? 'Voz gravada (sample áudio puro)' : 'Voix enregistrée (échantillon audio)'}
          aria-label={lang === 'pt' ? 'Voz gravada' : 'Voix enregistrée'}
        >
          <Mic size={13} />
        </button>
        <button
          type="button"
          onClick={() => setVocalMode('synth')}
          className={`px-1.5 md:px-2 py-0.5 md:py-1 text-[11px] md:text-xs font-bold border-l border-r border-[var(--cordel-border)] flex items-center justify-center transition-all cursor-pointer ${
            vocalMode === 'synth'
              ? 'bg-[var(--cordel-border)] text-[var(--cordel-bg)]'
              : 'text-[var(--cordel-text)] hover:bg-[var(--cordel-border)]/10'
          }`}
          title={lang === 'pt' ? 'Sintetizador melódico (notas MIDI)' : 'Synthétiseur de notes mélodiques'}
          aria-label={lang === 'pt' ? 'Sintetizador melódico' : 'Synthétiseur de notes mélodiques'}
        >
          <Music size={13} />
        </button>
        <button
          type="button"
          onClick={() => setVocalMode('both')}
          className={`px-1.5 md:px-2 py-0.5 md:py-1 text-[11px] md:text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
            vocalMode === 'both'
              ? 'bg-[var(--cordel-border)] text-[var(--cordel-bg)]'
              : 'text-[var(--cordel-text)] hover:bg-[var(--cordel-border)]/10'
          }`}
          title={lang === 'pt' ? 'Voz gravada + Sintetizador simultâneos' : 'Voix enregistrée + Synthétiseur simultanés'}
          aria-label={lang === 'pt' ? 'Voz + Sintetizador' : 'Voix + Synthétiseur'}
        >
          <Layers size={13} />
        </button>
      </div>
    </div>
  );
};
