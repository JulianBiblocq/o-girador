import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePortalRoot, useWindow } from '../../contexts/WindowContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import {
  canTransferPatterns,
  getInstrumentFamily,
  resolveTrackInstrumentId,
} from '../../utils/instrumentCompatibility';
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
  const hostWin = useWindow();
  const portalRoot = usePortalRoot();
  const lang = useSequencerStore((state) => state.lang);
  const tracks = useSequencerStore((state) => state.tracks);
  const track = useSequencerStore((state) => state.tracks.find((t) => t.id === trackId || String(t.id) === String(trackId)));
  const clipboard = useSequencerStore((state) => state.instrumentPatternsClipboard);

  useEffect(() => {
    const doc = hostWin.document;
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && e.target && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleWheel = () => onClose();

    doc.addEventListener('mousedown', handleMouseDown, true);
    doc.addEventListener('keydown', handleKeyDown);
    hostWin.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      doc.removeEventListener('mousedown', handleMouseDown, true);
      doc.removeEventListener('keydown', handleKeyDown);
      hostWin.removeEventListener('wheel', handleWheel);
    };
  }, [onClose, hostWin]);

  if (!track) return null;

  const inst = instrumentsConfig[track.instrumentIdx];
  const instName = track.customName || inst?.name || 'Instrument';
  const resolvedTargetInstId = resolveTrackInstrumentId(track, tracks);
  const targetFamily = getInstrumentFamily(resolvedTargetInstId);
  const isCompatible = clipboard ? canTransferPatterns(clipboard, track, tracks) : false;

  const menuWidth = 240;
  const menuHeight = 180;
  const adjustedX = Math.max(8, Math.min(x, (hostWin?.innerWidth || 800) - menuWidth - 12));
  const adjustedY = Math.max(8, Math.min(y, (hostWin?.innerHeight || 600) - menuHeight - 12));
  const patternCount = track.patterns?.length || 0;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Menu contextuel instrument"
      className="fixed z-[99999] bg-[var(--cordel-parchment-panel)] border-2 border-[var(--cordel-ink-dark)] shadow-[3px_3px_0px_var(--cordel-ink-dark)] rounded-sm py-1.5 w-[240px] select-none text-xs font-bold text-[var(--cordel-ink-dark)]"
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      <div className="px-3 py-1 text-[11px] font-cactus tracking-wide uppercase text-[var(--cordel-accent-readable)] border-b border-[var(--cordel-ink-dark)]/15 flex items-center justify-between">
        <span className="truncate">{instName}</span>
        <span className="text-[10px] text-[var(--cordel-ink-dark)]/60 lowercase font-mono">
          {patternCount} {lang === 'fr' ? (patternCount > 1 ? 'motifs' : 'motif') : (patternCount > 1 ? 'padrões' : 'padrão')}
        </span>
      </div>

      <InstrumentHeaderContextMenuItems
        trackId={trackId} lang={lang} clipboard={clipboard}
        isCompatible={isCompatible} targetFamily={targetFamily} onClose={onClose}
      />
    </div>,
    portalRoot
  );
};
