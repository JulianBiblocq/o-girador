/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Barre centrale Mode Percussion Mobile avec 3 boutons pleine largeur (< 100 lignes).
 */
import React, { useEffect } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { getEligibleReferenceTracks } from '../../utils/focusTrackSelector';
import { MobileSecondInstrumentSelector } from './MobileSecondInstrumentSelector';
import { Activity, BookOpen } from 'lucide-react';

interface Props {
  isAoVivoActive: boolean;
  onToggleAoVivo: () => void;
  isLetraActive: boolean;
  onToggleLetra: () => void;
  onOpenLetraDrawer: () => void;
  referenceTrackId: number | null;
  onSelectReferenceTrackId: (id: number | null) => void;
  primaryTrackId: number | null;
  lang?: 'fr' | 'pt';
}

export const MobilePercCenterBar: React.FC<Props> = ({
  isAoVivoActive, onToggleAoVivo, isLetraActive, onToggleLetra, onOpenLetraDrawer,
  referenceTrackId, onSelectReferenceTrackId, primaryTrackId, lang: propLang,
}) => {
  const storeLang = useSequencerStore((s) => s.lang);
  const lang = storeLang || propLang || 'pt';
  const currentMeasure = useSequencerStore((s) => s.currentMeasure);
  const tracks = useSequencerStore((s) => s.tracks);

  useEffect(() => {
    if (referenceTrackId !== null) {
      const eligible = getEligibleReferenceTracks(tracks, primaryTrackId);
      if (!eligible.some((t) => t.id === referenceTrackId)) {
        onSelectReferenceTrackId(null);
      }
    }
  }, [tracks, primaryTrackId, referenceTrackId, onSelectReferenceTrackId]);

  const puxTrack = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador' || t.customName === 'Puxador');
  const coroTrack = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro' || t.customName === 'Coro');
  const puxPattern = puxTrack?.patterns?.find((p) => p.measureAssignments?.[currentMeasure]) || puxTrack?.patterns?.[0];
  const coroPattern = coroTrack?.patterns?.find((p) => p.measureAssignments?.[currentMeasure]) || coroTrack?.patterns?.[0];
  const puxLyrics = puxPattern?.lyrics?.filter((l) => l && l.trim() && l.trim() !== '-').join(' ') || '';
  const coroLyrics = coroPattern?.lyrics?.filter((l) => l && l.trim() && l.trim() !== '-').join(' ') || '';

  return (
    <div className="w-full bg-[var(--cordel-surface)] px-2 py-1 flex flex-col gap-1 border-b-2 border-[var(--cordel-border)] shrink-0 select-none relative z-40">
      <div className="grid grid-cols-3 gap-1.5 w-full">
        <button
          onClick={onToggleAoVivo}
          className={`h-8 px-1 border-2 font-cactus font-bold text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 transition-colors shadow-[1px_1px_0_#000] active:translate-y-0.5 cursor-pointer ${
            isAoVivoActive ? 'bg-[#b94a2c] text-[#f4ecd8] border-black' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)] hover:border-[#b94a2c]'
          }`}
          title={lang === 'pt' ? 'Animação das baquetas ao vivo' : 'Animation des baguettes en direct'}
        >
          <Activity size={12} />
          <span className="truncate">Ao Vivo</span>
        </button>

        <button
          onClick={onToggleLetra}
          className={`h-8 px-1 border-2 font-cactus font-bold text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 transition-colors shadow-[1px_1px_0_#000] active:translate-y-0.5 cursor-pointer ${
            isLetraActive ? 'bg-[#b94a2c] text-[#f4ecd8] border-black' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)] hover:border-[#b94a2c]'
          }`}
        >
          <BookOpen size={12} />
          <span className="truncate">Letra</span>
        </button>

        <MobileSecondInstrumentSelector
          referenceTrackId={referenceTrackId}
          onSelectReferenceTrackId={onSelectReferenceTrackId}
          primaryTrackId={primaryTrackId}
          lang={lang}
        />
      </div>

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
