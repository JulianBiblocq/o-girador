/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { Activity, BookOpen, Shuffle, ShieldCheck } from 'lucide-react';

interface Props {
  isAoVivoActive: boolean;
  onToggleAoVivo: () => void;
  isLetraActive: boolean;
  onToggleLetra: () => void;
  onOpenLetraDrawer: () => void;
  lang?: 'fr' | 'pt';
}

export const MobilePercCenterBar: React.FC<Props> = ({
  isAoVivoActive, onToggleAoVivo, isLetraActive, onToggleLetra, onOpenLetraDrawer, lang: propLang,
}) => {
  const storeLang = useSequencerStore((s) => s.lang);
  const lang = storeLang || propLang || 'pt';
  const isolateBaseOnly = useSequencerStore((s) => s.isolateBaseOnly);
  const setIsolateBaseOnly = useSequencerStore((s) => s.setIsolateBaseOnly);
  const currentMeasure = useSequencerStore((s) => s.currentMeasure);
  const tracks = useSequencerStore((s) => s.tracks);

  const puxTrack = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador' || t.customName === 'Puxador');
  const coroTrack = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro' || t.customName === 'Coro');
  const puxPattern = puxTrack?.patterns?.find((p) => p.measureAssignments?.[currentMeasure]) || puxTrack?.patterns?.[0];
  const coroPattern = coroTrack?.patterns?.find((p) => p.measureAssignments?.[currentMeasure]) || coroTrack?.patterns?.[0];

  const puxLyrics = puxPattern?.lyrics?.filter((l) => l && l.trim() && l.trim() !== '-').join(' ') || '';
  const coroLyrics = coroPattern?.lyrics?.filter((l) => l && l.trim() && l.trim() !== '-').join(' ') || '';

  return (
    <div className="w-full bg-[var(--cordel-surface)] px-2 py-1 flex flex-col gap-1 border-b-2 border-[var(--cordel-border)] shrink-0 select-none">
      {/* 1. Ligne des 3 Bascules : Ao Vivo, Letra, Base Pure */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={onToggleAoVivo}
          className={`h-8 px-1 border-2 font-cactus font-bold text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 transition-colors shadow-[1px_1px_0_#000] active:translate-y-0.5 cursor-pointer ${
            isAoVivoActive ? 'bg-[#b94a2c] text-[#f4ecd8] border-black' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)] hover:border-[#b94a2c]'
          }`}
          title={lang === 'pt' ? 'Animação das baquetas e mãos ao vivo' : 'Animation des baguettes et mains en direct'}
        >
          <Activity size={12} />
          <span className="truncate">Ao Vivo</span>
        </button>

        <button
          onClick={onToggleLetra}
          className={`h-8 px-1 border-2 font-cactus font-bold text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 transition-colors shadow-[1px_1px_0_#000] active:translate-y-0.5 cursor-pointer ${
            isLetraActive ? 'bg-[#b94a2c] text-[#f4ecd8] border-black' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)] hover:border-[#b94a2c]'
          }`}
          title={lang === 'pt' ? 'Exibição da letra' : 'Affichage des paroles'}
        >
          <BookOpen size={12} />
          <span className="truncate">Letra</span>
        </button>

        <button
          onClick={() => setIsolateBaseOnly(!isolateBaseOnly)}
          className={`h-8 px-1 border-2 font-cactus font-bold text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 transition-colors shadow-[1px_1px_0_#000] active:translate-y-0.5 cursor-pointer ${
            isolateBaseOnly ? 'bg-[#8b2a1a] text-[#f4ecd8] border-black' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)] hover:border-[#b94a2c]'
          }`}
          title={isolateBaseOnly ? (lang === 'pt' ? 'Base pura (sem variações)' : 'Base pure (sans variations)') : (lang === 'pt' ? 'Variações ativas' : 'Variations aléatoires actives')}
        >
          {isolateBaseOnly ? <ShieldCheck size={12} className="text-[#f4ecd8]" /> : <Shuffle size={12} />}
          <span className="truncate">{isolateBaseOnly ? (lang === 'pt' ? 'Base Pura' : 'Base Pure') : (lang === 'pt' ? 'Variações' : 'Variations')}</span>
        </button>
      </div>

      {/* 2. Ligne synchrone de chant si activée */}
      {isLetraActive && (
        <div
          onClick={onOpenLetraDrawer}
          className="flex items-center gap-2 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] px-2 py-0.5 border border-[var(--cordel-border)] cursor-pointer hover:border-[#b94a2c] text-xs font-bold leading-tight truncate shadow-[1px_1px_0_#000]"
          title={lang === 'pt' ? 'Clique para abrir o caderno de letras' : 'Cliquer pour ouvrir le livret de paroles'}
        >
          <span className="text-[9px] font-mono uppercase text-[#b94a2c] font-bold shrink-0">LETRA:</span>
          {puxLyrics && <span className="text-[#c25e38] truncate">{puxLyrics}</span>}
          {coroLyrics && <span className="text-[#2a9d8f] truncate">[{coroLyrics}]</span>}
          {!puxLyrics && !coroLyrics && <span className="opacity-40 italic text-[10px] truncate">—</span>}
        </div>
      )}
    </div>
  );
};
