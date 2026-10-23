/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Barre supérieure de contrôle Mode Percussion Mobile avec sélecteur direct Focus (< 120 lignes).
 */
import React from 'react';
import { useSequencerStore, getTrackFamilyIds } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { getPlayableFocusTracks } from '../../utils/focusTrackSelector';
import { getEnsembleVocabulary } from '../../universes/styleVocabularyConfig';
import { CordelTarget } from '../ui/CordelTarget';
import { ChevronDown, ShieldCheck, Shuffle, Volume2, VolumeX, Users } from 'lucide-react';

interface Props {
  referenceTrackId: number | null;
  isRestMuted: boolean;
  onToggleRestMuted: () => void;
  onOpenFocusPopover: () => void;
  lang?: 'fr' | 'pt';
}

export const MobilePercControls: React.FC<Props> = ({
  referenceTrackId, isRestMuted, onToggleRestMuted, onOpenFocusPopover, lang: propLang,
}) => {
  const storeLang = useSequencerStore((s) => s.lang);
  const lang = storeLang || propLang || 'pt';
  const tracks = useSequencerStore((s) => s.tracks);
  const focusTrackId = useSequencerStore((s) => s.focusTrackId);
  const isolateBaseOnly = useSequencerStore((s) => s.isolateBaseOnly);
  const setIsolateBaseOnly = useSequencerStore((s) => s.setIsolateBaseOnly);
  const tocarJuntoIsMuted = useSequencerStore((s) => s.tocarJuntoIsMuted);
  const setTocarJuntoIsMuted = useSequencerStore((s) => s.setTocarJuntoIsMuted);
  const tocarJuntoMuteScope = useSequencerStore((s) => s.tocarJuntoMuteScope);
  const setTocarJuntoMuteScope = useSequencerStore((s) => s.setTocarJuntoMuteScope);

  const playable = getPlayableFocusTracks(tracks);
  const targetTrack = tracks.find((t) => t.id === focusTrackId);
  const inst = targetTrack ? instrumentsConfig[targetTrack.instrumentIdx] : null;
  const rawName = targetTrack?.customName || inst?.name || (lang === 'pt' ? 'Instrumento' : 'Instrument');
  const shortName = rawName.replace(/\s*\([^)]*\)/g, '').replace(/^\d+[\.\s\-]+/, '').trim();
  const trackIdx = playable.findIndex((t) => t.id === focusTrackId);
  const displayNumber = trackIdx >= 0 ? trackIdx + 1 : 1;

  const refTrack = referenceTrackId ? tracks.find((t) => t.id === referenceTrackId) : null;
  const refInst = refTrack ? instrumentsConfig[refTrack.instrumentIdx] : null;
  const refRawName = refTrack?.customName || refInst?.name || '';
  const refShortName = refRawName.replace(/\s*\([^)]*\)/g, '').replace(/^\d+[\.\s\-]+/, '').trim();
  const refTrackIdx = refTrack ? playable.findIndex((t) => t.id === refTrack.id) : -1;
  const refDisplayNumber = refTrackIdx >= 0 ? refTrackIdx + 1 : '';
  const vocab = getEnsembleVocabulary('maracatu', lang);

  const handleCycleMute = () => {
    if (!tocarJuntoIsMuted) {
      setTocarJuntoIsMuted(true);
      setTocarJuntoMuteScope('track');
    } else if (tocarJuntoMuteScope === 'track') {
      const hasFamily = focusTrackId !== null && getTrackFamilyIds(focusTrackId, tracks).length > 1;
      if (hasFamily) setTocarJuntoMuteScope('family');
      else setTocarJuntoIsMuted(false);
    } else {
      setTocarJuntoIsMuted(false);
    }
  };

  return (
    <div className="w-full bg-[var(--cordel-surface)] px-2 py-1 flex flex-col gap-1 border-b-2 border-[var(--cordel-border)] shrink-0 select-none relative z-30">
      {/* 1. Bouton sélecteur direct Focus plein format */}
      <button
        type="button"
        onClick={onOpenFocusPopover}
        className="w-full h-8 border-2 border-[#1a1a1a] shadow-[1px_1px_0_#000] px-2 flex items-center justify-between gap-1.5 bg-[#c25e38] text-[#f4ecd8] font-cactus cursor-pointer transition-colors active:translate-y-0.5"
        title={lang === 'pt' ? 'Escolher instrumentos e opções do Focus' : 'Choisir les instruments et options du Focus'}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
          <CordelTarget size={14} className="shrink-0 text-[#f4ecd8]" />
          <span className="text-xs font-black uppercase tracking-wider truncate">
            {displayNumber}. {shortName}
            {refTrack && (
              <span className="font-normal opacity-90 ml-1 text-[11px]">
                + {refDisplayNumber}. {refShortName}
              </span>
            )}
          </span>
        </div>
        <ChevronDown size={14} className="shrink-0 opacity-80" />
      </button>

      {/* 2. Ligne de bascules rapides compactes */}
      <div className="grid grid-cols-3 gap-1">
        <button
          onClick={() => setIsolateBaseOnly(!isolateBaseOnly)}
          className={`h-7 px-1 border-2 font-cactus font-bold text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 shadow-[1px_1px_0_#000] cursor-pointer truncate ${
            isolateBaseOnly ? 'bg-[#8b2a1a] text-[#f4ecd8] border-black' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)]'
          }`}
          title={lang === 'pt' ? 'Alternar Base Pura / Variações' : 'Basculer Base Pure / Variations'}
        >
          {isolateBaseOnly ? <ShieldCheck size={11} className="shrink-0" /> : <Shuffle size={11} className="shrink-0" />}
          <span className="truncate">{isolateBaseOnly ? (lang === 'pt' ? 'Base Pura' : 'Base Pure') : (lang === 'pt' ? 'Variações' : 'Variations')}</span>
        </button>

        <button
          onClick={handleCycleMute}
          className={`h-7 px-1 border-2 font-cactus font-bold text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 shadow-[1px_1px_0_#000] cursor-pointer truncate ${
            tocarJuntoIsMuted ? 'bg-[#8b2a1a] text-[#f4ecd8] border-black' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)]'
          }`}
          title={lang === 'pt' ? 'Ciclo de mudo para tocar junto' : 'Cycle de sourdine pour jouer par-dessus'}
        >
          {tocarJuntoIsMuted ? <VolumeX size={11} className="shrink-0" /> : <Volume2 size={11} className="shrink-0" />}
          <span className="truncate">
            {!tocarJuntoIsMuted ? (lang === 'pt' ? 'Áudio : ON' : 'Son : ON') : (tocarJuntoMuteScope === 'family' ? (lang === 'pt' ? 'Mudo : Naipe' : 'Muet : Pupitre') : (lang === 'pt' ? 'Mudo : Só' : 'Muet : Seul'))}
          </span>
        </button>

        <button
          onClick={onToggleRestMuted}
          className={`h-7 px-1 border-2 font-cactus font-bold text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 shadow-[1px_1px_0_#000] cursor-pointer truncate ${
            isRestMuted ? 'bg-[#8b2a1a] text-[#f4ecd8] border-black' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)]'
          }`}
          title={lang === 'pt' ? `Mutar / Desmutar o ${vocab.restOfEnsemble}` : `Muter / Démuter le ${vocab.restOfEnsemble}`}
        >
          <Users size={11} className="shrink-0" />
          <span className="truncate">{vocab.ensembleName} : {isRestMuted ? 'OFF' : 'ON'}</span>
        </button>
      </div>
    </div>
  );
};
