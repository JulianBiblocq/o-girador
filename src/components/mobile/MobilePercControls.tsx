import React, { useSyncExternalStore } from 'react';
import { useSequencerStore, getTrackFamilyIds } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { getPlayableFocusTracks } from '../../utils/focusTrackSelector';
import { getEnsembleVocabulary } from '../../universes/styleVocabularyConfig';
import {
  getIsFocusBalancoDrawerOpen,
  setFocusBalancoDrawerOpen,
  subscribeFocusBalancoDrawer,
} from '../../audio/groove/liveBalancoMorph';
import { CordelTarget } from '../ui/CordelTarget';
import { ChevronDown, Volume2, VolumeX, Users } from 'lucide-react';

interface Props {
  referenceTrackId: number | null;
  isRestMuted: boolean;
  onToggleRestMuted: () => void;
  onOpenFocusPopover: () => void;
  lang?: 'fr' | 'pt';
}

const BalancoWaveIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 shrink-0" aria-hidden="true">
    <path d="M2 15c2.5-4 5-4 7.5 0s5 4 7.5 0 3.5-3 5-1" />
    <line x1="12" y1="3" x2="16" y2="12" />
    <circle cx="16.5" cy="13" r="2" />
  </svg>
);

export const MobilePercControls: React.FC<Props> = ({
  referenceTrackId, isRestMuted, onToggleRestMuted, onOpenFocusPopover, lang: propLang,
}) => {
  const storeLang = useSequencerStore((s) => s.lang);
  const lang = storeLang || propLang || 'pt';
  const tracks = useSequencerStore((s) => s.tracks);
  const focusTrackId = useSequencerStore((s) => s.focusTrackId);
  const tocarJuntoIsMuted = useSequencerStore((s) => s.tocarJuntoIsMuted);
  const setTocarJuntoIsMuted = useSequencerStore((s) => s.setTocarJuntoIsMuted);
  const tocarJuntoMuteScope = useSequencerStore((s) => s.tocarJuntoMuteScope);
  const setTocarJuntoMuteScope = useSequencerStore((s) => s.setTocarJuntoMuteScope);
  const isBalancoOpen = useSyncExternalStore(subscribeFocusBalancoDrawer, getIsFocusBalancoDrawerOpen, getIsFocusBalancoDrawerOpen);

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

  const activeBtnClass = 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)]';
  const idleBtnClass = 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)]';

  return (
    <div className="w-full bg-[var(--cordel-surface)] px-2 py-1 flex flex-col gap-1 border-b-2 border-[var(--cordel-border)] shrink-0 select-none relative z-30">
      <button
        type="button"
        onClick={onOpenFocusPopover}
        className="w-full h-8 border-2 border-[var(--cordel-ink-dark)] shadow-[1px_1px_0_var(--cordel-shadow-color)] px-2 flex items-center justify-between gap-1.5 bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] font-cactus cursor-pointer transition-colors active:translate-y-0.5"
        title={lang === 'pt' ? 'Escolher instrumento em Focus' : 'Choisir un instrument en Focus'}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
          <CordelTarget size={14} className="shrink-0 text-[var(--cordel-on-accent)]" />
          <span className="text-xs font-black uppercase tracking-wider truncate">
            {displayNumber}. {shortName}
            {refTrack && <span className="font-normal opacity-90 ml-1 text-[11px]">+ {refDisplayNumber}. {refShortName}</span>}
          </span>
        </div>
        <ChevronDown size={14} className="shrink-0 opacity-80" />
      </button>

      <div className="grid grid-cols-3 gap-1">
        <button
          type="button"
          data-testid="mobile-perc-balanco-toggle"
          onClick={() => setFocusBalancoDrawerOpen(!isBalancoOpen)}
          aria-pressed={isBalancoOpen}
          className={`h-7 px-1 border-2 font-cactus font-bold text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 shadow-[1px_1px_0_var(--cordel-shadow-color)] cursor-pointer truncate ${isBalancoOpen ? activeBtnClass : idleBtnClass}`}
          title={lang === 'pt' ? 'Exibir / Ocultar o Balanço' : 'Afficher / Masquer le Balanço'}
        >
          <BalancoWaveIcon />
          <span className="truncate">Balanço</span>
        </button>

        <button
          type="button"
          onClick={handleCycleMute}
          className={`h-7 px-1 border-2 font-cactus font-bold text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 shadow-[1px_1px_0_var(--cordel-shadow-color)] cursor-pointer truncate ${tocarJuntoIsMuted ? activeBtnClass : idleBtnClass}`}
          title={lang === 'pt' ? 'Ciclo de mudo para tocar junto' : 'Cycle de sourdine pour jouer par-dessus'}
        >
          {tocarJuntoIsMuted ? <VolumeX size={11} className="shrink-0" /> : <Volume2 size={11} className="shrink-0" />}
          <span className="truncate">
            {!tocarJuntoIsMuted ? (lang === 'pt' ? 'Áudio : ON' : 'Son : ON') : (tocarJuntoMuteScope === 'family' ? (lang === 'pt' ? 'Mudo : Naipe' : 'Muet : Pupitre') : (lang === 'pt' ? 'Mudo : Só' : 'Muet : Seul'))}
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleRestMuted}
          className={`h-7 px-1 border-2 font-cactus font-bold text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 shadow-[1px_1px_0_var(--cordel-shadow-color)] cursor-pointer truncate ${isRestMuted ? activeBtnClass : idleBtnClass}`}
          title={lang === 'pt' ? `Mutar / Desmutar o ${vocab.restOfEnsemble}` : `Muter / Démuter le ${vocab.restOfEnsemble}`}
        >
          <Users size={11} className="shrink-0" />
          <span className="truncate">{vocab.ensembleName} : {isRestMuted ? 'OFF' : 'ON'}</span>
        </button>
      </div>
    </div>
  );
};
