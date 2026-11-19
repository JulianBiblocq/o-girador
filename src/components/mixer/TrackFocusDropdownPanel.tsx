import React, { useRef, useEffect } from 'react';
import { instrumentsConfig, ASSETS_BASE_URL } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { getPlayableFocusTracks } from '../../utils/focusTrackSelector';
import { getInstrumentPrimaryStrongColor, getContrastColor } from '../../utils/colorHelpers';
import { TrackGroup } from '../../types';

interface TrackFocusDropdownPanelProps {
  tracks: TrackGroup[];
  focusTrackId: number | null;
  onClose: () => void;
  lang?: string;
  position?: { top: number; left: number };
}

export const TrackFocusDropdownPanel: React.FC<TrackFocusDropdownPanelProps> = ({
  tracks,
  focusTrackId,
  onClose,
  lang = 'fr',
  position,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const activateFocusOnTrack = useSequencerStore((s) => s.activateFocusOnTrack);

  useEffect(() => {
    const doc = panelRef.current?.ownerDocument || document;
    const handleDown = (e: MouseEvent | TouchEvent) => {
      if (panelRef.current && e.target && !panelRef.current.contains(e.target as Node)) onClose();
    };
    doc.addEventListener('mousedown', handleDown);
    doc.addEventListener('touchstart', handleDown);
    return () => {
      doc.removeEventListener('mousedown', handleDown);
      doc.removeEventListener('touchstart', handleDown);
    };
  }, [onClose]);

  const playable = getPlayableFocusTracks(tracks);

  const handleSelectInstrument = (trackId: number) => {
    activateFocusOnTrack(trackId);
    onClose();
  };

  return (
    <div
      ref={panelRef}
      style={position ? { position: 'fixed', top: position.top, left: position.left, width: 320 } : undefined}
      className={`z-[99999] w-[320px] bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border-2 border-[var(--cordel-ink-dark)] shadow-[4px_4px_0px_var(--cordel-ink-dark)] p-2.5 flex flex-col gap-2 text-xs font-cactus select-none max-h-[calc(100vh-120px)] overflow-y-auto ${position ? '' : 'absolute left-0 top-full mt-1'}`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--cordel-ink-dark)]/70 pb-1 border-b border-[var(--cordel-ink-dark)]/30">
        {lang === 'pt' ? 'Escolher instrumento em Focus' : 'Choisir son instrument en Focus'}
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
              onClick={() => handleSelectInstrument(t.id)}
              className={`xilo-wood-stamp flex items-center gap-1.5 px-1.5 py-1.5 cordel-border-sm text-left transition-all cursor-pointer ${
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
  );
};
