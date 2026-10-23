
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { canTransferPatterns, getInstrumentFamily } from '../../utils/instrumentCompatibility';
import { InstrumentHeaderContextMenuItems } from './menu/InstrumentHeaderContextMenuItems';

export interface InstrumentHeaderContextMenuProps {
  trackId: number;
  x: number;
  y: number;
  onClose: () => void;
}

export const InstrumentHeaderContextMenu: React.FC<InstrumentHeaderContextMenuProps> = ({
  trackId, x, y, onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const lang = useSequencerStore(state => state.lang);
  const track = useSequencerStore(state => state.tracks.find(t => t.id === trackId || String(t.id) === String(trackId)));
  const clipboard = useSequencerStore(state => state.instrumentPatternsClipboard);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleWheel = () => onClose();

    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [onClose]);

  if (!track) return null;

  const inst = instrumentsConfig[track.instrumentIdx];
  const instName = track.customName || inst?.name || 'Instrument';
  const targetFamily = getInstrumentFamily(inst?.id || '');
  const isCompatible = clipboard ? canTransferPatterns(clipboard, track) : false;

  const menuWidth = 240;
  const menuHeight = 180;
  const adjustedX = Math.max(8, Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 800) - menuWidth - 12));
  const adjustedY = Math.max(8, Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : 600) - menuHeight - 12));
  const patternCount = track.patterns?.length || 0;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Menu contextuel instrument"
      className="fixed z-[99999] bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[3px_3px_0px_#1a1a1a] rounded-sm py-1.5 w-[240px] select-none text-xs font-bold text-[#1a1a1a]"
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      <div className="px-3 py-1 text-[11px] font-cactus tracking-wide uppercase text-[#8b2a1a] border-b border-[#1a1a1a]/15 flex items-center justify-between">
        <span className="truncate">{instName}</span>
        <span className="text-[10px] text-[#1a1a1a]/60 lowercase font-mono">
          {patternCount} {lang === 'fr' ? (patternCount > 1 ? 'motifs' : 'motif') : (patternCount > 1 ? 'padrões' : 'padrão')}
        </span>
      </div>

      <InstrumentHeaderContextMenuItems
        trackId={trackId} lang={lang} clipboard={clipboard}
        isCompatible={isCompatible} targetFamily={targetFamily} onClose={onClose}
      />
    </div>,
    document.body
  );
};
