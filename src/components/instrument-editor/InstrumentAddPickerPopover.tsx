import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { usePortalRoot, useWindow } from '../../contexts/WindowContext';
import { instrumentsConfig } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useInstrumentLabel } from '../../stores/useNomenclatureStore';
import { CordelInstrumentIcon } from '../icons/CordelInstrumentIcon';

interface InstrumentAddPickerPopoverProps {
  anchorRect: DOMRect | null;
  onSelectInstrument: (instIdx: number) => void;
  onClose: () => void;
}

export const InstrumentAddPickerPopover: React.FC<InstrumentAddPickerPopoverProps> = ({
  anchorRect,
  onSelectInstrument,
  onClose,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const hostWin = useWindow();
  const portalRoot = usePortalRoot();
  const lang = useSequencerStore((state) => state.lang);
  const getInstrumentLabel = useInstrumentLabel();

  useEffect(() => {
    const doc = hostWin.document;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target || popoverRef.current?.contains(target)) return;
      if (target.closest?.('[data-add-instrument-trigger="true"]')) return;
      onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleWheel = (e: WheelEvent) => {
      if (popoverRef.current && e.target && popoverRef.current.contains(e.target as Node)) return;
      onClose();
    };

    doc.addEventListener('mousedown', handleMouseDown, true);
    doc.addEventListener('keydown', handleKeyDown);
    hostWin.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      doc.removeEventListener('mousedown', handleMouseDown, true);
      doc.removeEventListener('keydown', handleKeyDown);
      hostWin.removeEventListener('wheel', handleWheel);
    };
  }, [onClose, hostWin]);

  if (!anchorRect) return null;

  const availableInstruments = instrumentsConfig
    .map((inst, idx) => ({ inst, idx }))
    .filter(({ inst }) => inst.id !== 'puxador' && inst.id !== 'coro');

  const popoverWidth = 296;
  const popoverHeight = 336;
  const viewportWidth = hostWin?.innerWidth || 800;
  const viewportHeight = hostWin?.innerHeight || 600;

  let top = anchorRect.bottom + 6;
  if (top + popoverHeight > viewportHeight - 12) {
    top = Math.max(12, anchorRect.top - popoverHeight - 6);
  }
  const left = Math.max(8, Math.min(anchorRect.left, viewportWidth - popoverWidth - 12));

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={lang === 'fr' ? 'Sélection d’instrument' : 'Seleção de instrumento'}
      className="fixed z-[99999] bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] cordel-wood-shadow rounded-sm p-2.5 w-[296px] select-none text-xs font-bold animate-in fade-in zoom-in-95 duration-100"
      style={{ left: `${left}px`, top: `${top}px` }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      <div className="px-1.5 pb-1.5 mb-2 text-[11px] font-cactus tracking-wide uppercase text-[var(--cordel-accent-readable)] border-b-2 border-[var(--cordel-border)] flex items-center justify-between">
        <span>{lang === 'fr' ? '+ Ajouter un instrument' : '+ Adicionar instrumento'}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-[var(--cordel-text-muted)] hover:text-[var(--cordel-text)] p-0.5 rounded-sm cursor-pointer transition-colors"
          title={lang === 'fr' ? 'Fermer' : 'Fechar'}
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5 max-h-[272px] overflow-y-auto pr-0.5 [scrollbar-width:thin]">
        {availableInstruments.map(({ inst, idx }) => {
          const label = getInstrumentLabel(idx) || inst.name;
          return (
            <button
              key={idx}
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onSelectInstrument(idx);
                onClose();
              }}
              className="flex items-center gap-2 px-2 py-1.5 bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] cordel-wood-shadow-sm hover:bg-[var(--cordel-accent)] hover:text-[var(--cordel-on-accent)] hover:border-[var(--cordel-border-strong)] active:translate-y-[1px] rounded-sm cursor-pointer transition-colors duration-150 text-left"
            >
              <CordelInstrumentIcon instrumentId={inst.id} className="w-5 h-5 shrink-0" />
              <span className="font-cactus font-bold text-[11px] uppercase tracking-wide truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </div>,
    portalRoot
  );
};
