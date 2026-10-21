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
  isAoVivoActive, onToggleAoVivo, isLetraActive, onToggleLetra, onOpenLetraDrawer, lang = 'pt',
}) => {
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
    <div className="w-full bg-[#121212] px-2 py-1 flex flex-col gap-1 border-b border-[var(--cordel-border)] shrink-0 select-none">
      {/* 1. Ligne des 3 Bascules : Ao Vivo, Letra, Base Pure */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={onToggleAoVivo}
          className={`h-8 px-1 cordel-border-sm font-cactus font-bold text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 transition-colors shadow-[1px_1px_0_var(--cordel-border)] active:translate-y-0.5 ${
            isAoVivoActive ? 'bg-[#b94a2c] text-[#f4ecd8] border-[#f4ecd8]' : 'bg-[#1a1a1a] text-[var(--cordel-text)] hover:border-[#b94a2c]'
          }`}
          title="Animation des baguettes et mains en direct"
        >
          <Activity size={12} />
          <span className="truncate">Ao Vivo</span>
        </button>

        <button
          onClick={onToggleLetra}
          className={`h-8 px-1 cordel-border-sm font-cactus font-bold text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 transition-colors shadow-[1px_1px_0_var(--cordel-border)] active:translate-y-0.5 ${
            isLetraActive ? 'bg-[#b94a2c] text-[#f4ecd8] border-[#f4ecd8]' : 'bg-[#1a1a1a] text-[var(--cordel-text)] hover:border-[#b94a2c]'
          }`}
          title="Affichage des paroles"
        >
          <BookOpen size={12} />
          <span className="truncate">Letra</span>
        </button>

        <button
          onClick={() => setIsolateBaseOnly(!isolateBaseOnly)}
          className={`h-8 px-1 cordel-border-sm font-cactus font-bold text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 transition-colors shadow-[1px_1px_0_var(--cordel-border)] active:translate-y-0.5 ${
            isolateBaseOnly ? 'bg-[#1a1a1a] text-[#d4af37] border-[#d4af37]' : 'bg-[#1a1a1a] text-[var(--cordel-text)] hover:border-[#b94a2c]'
          }`}
          title={isolateBaseOnly ? 'Base pure (sans variations aléatoires)' : 'Variations aléatoires actives'}
        >
          {isolateBaseOnly ? <ShieldCheck size={12} className="text-[#d4af37]" /> : <Shuffle size={12} />}
          <span className="truncate">{isolateBaseOnly ? (lang === 'pt' ? 'Base Pura' : 'Base Pure') : 'Variations'}</span>
        </button>
      </div>

      {/* 2. Ligne synchrone de chant si activée */}
      {isLetraActive && (
        <div
          onClick={onOpenLetraDrawer}
          className="flex items-center gap-2 bg-[#1a1a1a] px-2 py-0.5 border border-[var(--cordel-border)] cursor-pointer hover:border-[#b94a2c] text-xs font-bold leading-tight truncate shadow-[1px_1px_0_var(--cordel-border)]"
          title="Cliquer pour ouvrir le livret de paroles"
        >
          <span className="text-[9px] font-mono uppercase text-[#b94a2c] font-bold shrink-0">LETRA:</span>
          {puxLyrics && <span className="text-[#c25e38] truncate">{puxLyrics}</span>}
          {coroLyrics && <span className="text-[#2a9d8f] truncate">[{coroLyrics}]</span>}
          {!puxLyrics && !coroLyrics && <span className="text-[var(--cordel-text)]/40 italic text-[10px] truncate">—</span>}
        </div>
      )}
    </div>
  );
};
