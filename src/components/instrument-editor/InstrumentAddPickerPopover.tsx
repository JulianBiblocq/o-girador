import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { instrumentsConfig, ASSETS_BASE_URL } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useInstrumentLabel } from '../../stores/useNomenclatureStore';

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
  const lang = useSequencerStore((state) => state.lang);
  const getInstrumentLabel = useInstrumentLabel();

  // Fermeture sur clic extérieur ou touche Échap
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    const handleWheel = () => {
      onClose();
    };

    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [onClose]);

  if (!anchorRect) return null;

  // Filtrer les instruments individuels (exclure puxador et coro qui sont générés par le bus Toada)
  const availableInstruments = instrumentsConfig
    .map((inst, idx) => ({ inst, idx }))
    .filter(({ inst }) => inst.id !== 'puxador' && inst.id !== 'coro');

  const popoverWidth = 280;
  const popoverHeight = 320;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 800;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 600;

  let top = anchorRect.bottom + 6;
  if (top + popoverHeight > viewportHeight - 12) {
    top = Math.max(12, anchorRect.top - popoverHeight - 6);
  }
  const left = Math.max(8, Math.min(anchorRect.left, viewportWidth - popoverWidth - 12));

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Sélection d'instrument"
      className="fixed z-[99999] bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[4px_4px_0px_#1a1a1a] rounded-sm p-2 w-[280px] select-none text-xs font-bold text-[#1a1a1a] animate-in fade-in zoom-in-95 duration-100"
      style={{
        left: `${left}px`,
        top: `${top}px`,
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* En-tête Cordel */}
      <div className="px-2 py-1 mb-1.5 text-[11px] font-cactus tracking-wide uppercase text-[#8b2a1a] border-b border-[#1a1a1a]/15 flex items-center justify-between">
        <span>{lang === 'fr' ? '+ Ajouter un instrument' : '+ Adicionar instrumento'}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-[#1a1a1a]/50 hover:text-[#1a1a1a] px-1 font-bold cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Grille des instruments */}
      <div className="grid grid-cols-2 gap-1.5 max-h-[260px] overflow-y-auto pr-0.5 [scrollbar-width:thin]">
        {availableInstruments.map(({ inst, idx }) => {
          const label = getInstrumentLabel(idx) || inst.name;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onSelectInstrument(idx);
                onClose();
              }}
              className="flex items-center gap-2 p-1.5 border border-[#1a1a1a]/30 hover:border-[#8b2a1a] bg-[#fbf8f0]/80 hover:bg-[#8b2a1a] hover:text-[#f4ecd8] rounded-sm cursor-pointer transition-all duration-150 text-left group"
            >
              {inst.iconImg ? (
                <img
                  src={`${ASSETS_BASE_URL}${inst.iconImg}`}
                  alt={label}
                  className="w-5 h-5 object-contain shrink-0 filter group-hover:brightness-0 group-hover:invert"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="w-5 h-5 flex items-center justify-center font-cactus text-[10px] shrink-0">
                  🥁
                </span>
              )}
              <span className="font-cactus font-bold text-[11px] uppercase tracking-wide truncate">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
};
