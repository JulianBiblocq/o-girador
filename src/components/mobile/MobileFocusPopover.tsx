import React from 'react';
import { instrumentsConfig, ASSETS_BASE_URL } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { getPlayableFocusTracks } from '../../utils/focusTrackSelector';
import { getInstrumentPrimaryStrongColor, getContrastColor } from '../../utils/colorHelpers';
import { TrackGroup } from '../../types';
import { CordelTarget } from '../ui/CordelTarget';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  referenceTrackId?: number | null;
  onSelectReferenceTrackId?: (id: number | null) => void;
  isRestMuted?: boolean;
  onToggleRestMuted?: () => void;
  lang: 'fr' | 'pt';
}

export const MobileFocusPopover: React.FC<Props> = ({
  isOpen, onClose, referenceTrackId, onSelectReferenceTrackId, lang,
}) => {
  const tracks = useSequencerStore((s) => s.tracks);
  const focusTrackId = useSequencerStore((s) => s.focusTrackId);
  const activateFocusOnTrack = useSequencerStore((s) => s.activateFocusOnTrack);

  if (!isOpen) return null;
  const playable = getPlayableFocusTracks(tracks);

  const handleSelectTrack = (t: TrackGroup) => {
    activateFocusOnTrack(t.id);
    if (referenceTrackId === t.id && onSelectReferenceTrackId) onSelectReferenceTrackId(null);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-[var(--cordel-shadow-color)] backdrop-blur-xs select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border-2 border-[var(--cordel-ink-dark)] shadow-[4px_4px_0px_var(--cordel-ink-dark)] p-3 flex flex-col gap-2.5 text-xs font-cactus max-h-[82dvh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-1.5 border-b border-[var(--cordel-ink-dark)]/30">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-sm text-[var(--cordel-wood)]">
            <CordelTarget size={16} />
            <span>{lang === 'pt' ? 'Escolher instrumento' : 'Choisir un instrument'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 border border-[var(--cordel-ink-dark)] flex items-center justify-center font-bold hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-parchment-bg)] cursor-pointer"
            aria-label={lang === 'pt' ? 'Fechar' : 'Fermer'}
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 max-h-[320px] overflow-y-auto pr-0.5">
          {playable.map((t, idx) => {
            const inst = instrumentsConfig[t.instrumentIdx];
            const isSelected = t.id === focusTrackId;
            const raw = t.customName || inst?.name || `Track ${idx + 1}`;
            const name = raw.replace(/\s*\([^)]*\)/g, '').replace(/^\d+[\.\s\-]+/, '').trim();
            const bg = getInstrumentPrimaryStrongColor(inst, t);
            const fg = getContrastColor(bg);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectTrack(t)}
                className={`xilo-wood-stamp flex items-center gap-1.5 px-2 py-1.5 cordel-border-sm text-left transition-all cursor-pointer ${
                  isSelected ? 'ring-2 ring-[var(--cordel-ink-dark)] font-black' : 'opacity-90 hover:opacity-100'
                }`}
                style={{ backgroundColor: bg, color: fg }}
              >
                <img
                  src={`${ASSETS_BASE_URL}${inst?.iconImg}`}
                  alt={name}
                  className="w-3.5 h-3.5 object-contain filter invert opacity-90 shrink-0"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
                <span className="truncate flex-1 text-[11px] leading-tight font-medium">{idx + 1}. {name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
