import React from 'react';
import { useSequencerStore, getTrackFamilyIds } from '../../stores/useSequencerStore';
import { getPlayableFocusTracks } from '../../utils/focusTrackSelector';
import { getEnsembleVocabulary } from '../../universes/styleVocabularyConfig';
import { TrackGroup } from '../../types';
import { CordelTarget } from '../ui/CordelTarget';
import { X } from 'lucide-react';
import { MobileFocusTocarJuntoSection } from './MobileFocusTocarJuntoSection';
import { MobileFocusPupitreSection } from './MobileFocusPupitreSection';
import { FocusBalancoMenuButton } from '../focus-balanco/FocusBalancoMenuButton';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  referenceTrackId: number | null;
  onSelectReferenceTrackId: (id: number | null) => void;
  isRestMuted: boolean;
  onToggleRestMuted: () => void;
  lang: 'fr' | 'pt';
}

export const MobileFocusPopover: React.FC<Props> = ({
  isOpen, onClose, referenceTrackId, onSelectReferenceTrackId, isRestMuted, onToggleRestMuted, lang,
}) => {
  const tracks = useSequencerStore((s) => s.tracks);
  const focusTrackId = useSequencerStore((s) => s.focusTrackId);
  const setFocusTrackId = useSequencerStore((s) => s.setFocusTrackId);
  const setActiveAoVivoTrackId = useSequencerStore((s) => s.setActiveAoVivoTrackId);
  const isolateBaseOnly = useSequencerStore((s) => s.isolateBaseOnly);
  const setIsolateBaseOnly = useSequencerStore((s) => s.setIsolateBaseOnly);
  const tocarJuntoIsMuted = useSequencerStore((s) => s.tocarJuntoIsMuted);
  const setTocarJuntoIsMuted = useSequencerStore((s) => s.setTocarJuntoIsMuted);
  const tocarJuntoMuteScope = useSequencerStore((s) => s.tocarJuntoMuteScope);
  const setTocarJuntoMuteScope = useSequencerStore((s) => s.setTocarJuntoMuteScope);

  if (!isOpen) return null;
  const vocab = getEnsembleVocabulary('maracatu', lang);
  const playable = getPlayableFocusTracks(tracks);
  const hasFamily = focusTrackId !== null && getTrackFamilyIds(focusTrackId, tracks).length > 1;

  const handleSelectTrack = (t: TrackGroup) => {
    setFocusTrackId(t.id, undefined, true);
    setActiveAoVivoTrackId(t.id);
    if (!useSequencerStore.getState().isFocusActive) useSequencerStore.setState({ isFocusActive: true });
    if (referenceTrackId === t.id) onSelectReferenceTrackId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-[var(--cordel-shadow-color)] backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border-2 border-[var(--cordel-ink-dark)] shadow-[4px_4px_0px_var(--cordel-ink-dark)] p-3 flex flex-col gap-2 text-xs font-cactus max-h-[82dvh] overflow-y-auto">
        <div className="flex items-center justify-between pb-1.5 border-b border-[var(--cordel-ink-dark)]/30">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-sm text-[var(--cordel-wood)]">
            <CordelTarget size={16} />
            <span>{lang === 'pt' ? 'Opções do Focus' : 'Options du Focus'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 border border-[var(--cordel-ink-dark)] flex items-center justify-center font-bold hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-parchment-bg)] cursor-pointer"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        <MobileFocusPupitreSection
          tracks={tracks}
          playable={playable}
          focusTrackId={focusTrackId}
          referenceTrackId={referenceTrackId}
          onSelectTrack={handleSelectTrack}
          onSelectReferenceTrackId={onSelectReferenceTrackId}
          lang={lang}
        />

        <div className="pt-1 border-t border-[var(--cordel-ink-dark)]/30">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--cordel-ink-dark)]/70 mb-1">
            {lang === 'pt' ? '2. Modo de variações' : '2. Mode des variations'}
          </div>
          <div className="flex flex-col gap-1 text-[11px]">
            <label className="flex items-center gap-2 cursor-pointer hover:opacity-80">
              <input type="radio" name="mobileFocusVar" checked={isolateBaseOnly} onChange={() => setIsolateBaseOnly(true)} className="accent-[var(--cordel-ink-dark)]" style={{ colorScheme: 'light' }} />
              <span>{lang === 'pt' ? 'Base pura (frase mestra + chamada)' : 'Base pure (phrase maîtresse + amorce)'}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:opacity-80">
              <input type="radio" name="mobileFocusVar" checked={!isolateBaseOnly} onChange={() => setIsolateBaseOnly(false)} className="accent-[var(--cordel-ink-dark)]" style={{ colorScheme: 'light' }} />
              <span>{lang === 'pt' ? 'Jogo livre com variações' : 'Jeu libre avec variations'}</span>
            </label>
          </div>
        </div>

        <MobileFocusTocarJuntoSection
          lang={lang}
          vocab={vocab}
          hasFamily={hasFamily}
          tocarJuntoIsMuted={tocarJuntoIsMuted}
          setTocarJuntoIsMuted={setTocarJuntoIsMuted}
          tocarJuntoMuteScope={tocarJuntoMuteScope}
          setTocarJuntoMuteScope={setTocarJuntoMuteScope}
          isRestMuted={isRestMuted}
          onToggleRestMuted={onToggleRestMuted}
        />

        <FocusBalancoMenuButton lang={lang} onCloseMenu={onClose} />

        <div className="pt-1.5 border-t border-[var(--cordel-ink-dark)]/30">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-8 border-2 border-[var(--cordel-ink-dark)] shadow-[2px_2px_0px_var(--cordel-ink-dark)] flex items-center justify-center gap-1.5 bg-[var(--cordel-accent)] hover:bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] font-cactus font-bold text-xs uppercase cursor-pointer transition-colors active:translate-y-0.5"
          >
            <span>{lang === 'pt' ? 'CONFIRMAR' : 'VALIDER'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
