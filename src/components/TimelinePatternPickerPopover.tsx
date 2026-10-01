import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSequencerStore, isToadaBus } from '../stores/useSequencerStore';
import { instrumentsConfig } from '../data';
import { Pattern } from '../types';

export interface TimelinePatternPickerPopoverProps {
  trackId: number;
  measureIdx: number;
  anchorRect: DOMRect;
  onClose: () => void;
}

export const TimelinePatternPickerPopover: React.FC<TimelinePatternPickerPopoverProps> = ({
  trackId,
  measureIdx,
  anchorRect,
  onClose,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: anchorRect.bottom + 4,
    left: Math.max(8, Math.min(anchorRect.left, window.innerWidth - 200)),
  });

  const tracks = useSequencerStore((state) => state.tracks);
  const handleTimelinePatternAssign = useSequencerStore((state) => state.handleTimelinePatternAssign);
  const lang = useSequencerStore((state) => state.lang);

  const targetTrack = tracks.find((t) => t.id === trackId);
  const instInfo = targetTrack ? instrumentsConfig[targetTrack.instrumentIdx] : null;
  const trackTitle = targetTrack?.customName || instInfo?.name || (lang === 'fr' ? 'Piste' : 'Faixa');
  const instColor = instInfo?.colors?.['D'] || instInfo?.color || instInfo?.mixerBg || '#e67e22';

  const isSlave = Boolean(
    targetTrack?.linkedToTrackId && !targetTrack.isLinkFolder && !targetTrack.isLinkMaster
  );

  // Détermination de la liste des motifs
  let patternsList: Pattern[] = [];
  if (targetTrack) {
    if (isToadaBus(targetTrack)) {
      const puxTrack = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
      const coroTrack = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
      patternsList = [...(puxTrack?.patterns || []), ...(coroTrack?.patterns || [])];
    } else if (targetTrack.linkedToTrackId && !targetTrack.isLinkFolder) {
      const parentBus = tracks.find(
        (p) => String(p.id) === String(targetTrack.linkedToTrackId) && p.isLinkFolder
      );
      patternsList = parentBus ? parentBus.patterns : targetTrack.patterns;
    } else {
      patternsList = targetTrack.patterns;
    }
  }

  // Détermination du motif actif pour cette mesure
  let activePatternId: number | null | undefined = null;
  let isFollowingMaster = false;

  if (isSlave) {
    const override = targetTrack?.patternOverrides?.[measureIdx];
    if (override === null) {
      activePatternId = null; // Silence explicite
    } else if (override !== undefined) {
      activePatternId = override;
    } else {
      // Suivre le maître
      isFollowingMaster = true;
      const parentBus = tracks.find(
        (p) => String(p.id) === String(targetTrack?.linkedToTrackId) && p.isLinkFolder
      );
      const masterPtn = parentBus?.patterns.find((p) => p.measureAssignments[measureIdx]);
      activePatternId = masterPtn ? masterPtn.id : null;
    }
  } else if (targetTrack && isToadaBus(targetTrack)) {
    const puxTrack = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
    const coroTrack = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
    const pPtn = puxTrack?.patterns.find((p) => p.measureAssignments[measureIdx]);
    const cPtn = coroTrack?.patterns.find((p) => p.measureAssignments[measureIdx]);
    activePatternId = pPtn?.id ?? cPtn?.id ?? null;
  } else {
    const activePtn = targetTrack?.patterns.find((p) => p.measureAssignments[measureIdx]);
    activePatternId = activePtn ? activePtn.id : null;
  }

  // Calcul du positionnement dynamique (collision viewport)
  useLayoutEffect(() => {
    if (!popoverRef.current) return;
    const rect = popoverRef.current.getBoundingClientRect();
    const margin = 8;
    let top = anchorRect.bottom + 4;
    let left = anchorRect.left;

    // Débordement en bas : on bascule au-dessus de la cellule
    if (top + rect.height > window.innerHeight - margin) {
      const above = anchorRect.top - rect.height - 4;
      if (above >= margin) {
        top = above;
      } else {
        top = Math.max(margin, window.innerHeight - rect.height - margin);
      }
    }

    // Bornage horizontal
    if (left + rect.width > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - rect.width - margin);
    }
    if (left < margin) {
      left = margin;
    }

    setPosition({ top, left });
  }, [anchorRect]);

  // Gestion des écouteurs de fermeture (anti-fermeture immédiate + escape + scroll)
  useEffect(() => {
    let isAttached = false;

    const handlePointerDown = (e: PointerEvent) => {
      if (!isAttached) return;
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    const handleScrollOrWheel = () => {
      onClose();
    };

    // Micro-délai pour immuniser contre le 2e clic du double-clic
    const timer = setTimeout(() => {
      isAttached = true;
      window.addEventListener('pointerdown', handlePointerDown);
    }, 50);

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('close-popups', onClose);
    window.addEventListener('scroll', handleScrollOrWheel, true);
    window.addEventListener('wheel', handleScrollOrWheel, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('close-popups', onClose);
      window.removeEventListener('scroll', handleScrollOrWheel, true);
      window.removeEventListener('wheel', handleScrollOrWheel);
    };
  }, [onClose]);

  useEffect(() => {
    popoverRef.current?.focus();
  }, []);

  const handleSelect = (selectedPatternId: number | null | undefined) => {
    handleTimelinePatternAssign(trackId, selectedPatternId, measureIdx);
    onClose();
  };

  return createPortal(
    <div
      ref={popoverRef}
      tabIndex={-1}
      data-testid="timeline-pattern-picker-popover"
      data-track-id={trackId}
      data-measure-idx={measureIdx}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className="bg-[#f4ecd8] dark:bg-[#25201b] border-2 border-[#1a1a1a] dark:border-[#f4ecd8]/80 shadow-[4px_4px_0px_#1a1a1a] dark:shadow-[4px_4px_0px_#f4ecd8] font-cactus z-50 p-1 min-w-[160px] max-w-[240px] max-h-[260px] overflow-y-auto custom-scrollbar select-none outline-none"
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {/* En-tête : Piste & Numéro de mesure */}
      <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--cordel-text)] border-b border-[#1a1a1a]/20 dark:border-[#f4ecd8]/20 flex items-center justify-between mb-1">
        <span className="truncate pr-2">{trackTitle}</span>
        <span className="text-[10px] opacity-60 shrink-0 font-sans font-bold">
          M{measureIdx + 1}
        </span>
      </div>

      <div className="flex flex-col gap-0.5">
        {/* Option Suivre le maître si piste liée */}
        {isSlave && (
          <button
            type="button"
            onClick={() => handleSelect(undefined)}
            className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between transition-colors ${
              isFollowingMaster
                ? 'bg-[#8b2a1a]/15 dark:bg-[#8b2a1a]/30 font-bold text-[#8b2a1a] dark:text-[#f39c12]'
                : 'hover:bg-[#1a1a1a]/5 dark:hover:bg-white/10 text-[var(--cordel-text)]'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-xs">🔗</span>
              <span className="truncate">
                {lang === 'fr' ? 'Suivre le maître' : 'Seguir mestre'}
              </span>
            </div>
            {isFollowingMaster && (
              <span className="text-xs font-bold text-[#8b2a1a] dark:text-[#f39c12] ml-2 shrink-0">
                ✓
              </span>
            )}
          </button>
        )}

        {/* Option Silence */}
        <button
          type="button"
          onClick={() => handleSelect(null)}
          className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between transition-colors ${
            !isFollowingMaster && activePatternId === null
              ? 'bg-[#1a1a1a]/10 dark:bg-white/10 font-bold text-[var(--cordel-text)]'
              : 'hover:bg-[#1a1a1a]/5 dark:hover:bg-white/5 text-[var(--cordel-text)] opacity-85'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <div
              className="w-3.5 h-3.5 rounded border border-[#1a1a1a]/40 dark:border-white/40 shrink-0 opacity-40"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 4px)',
              }}
            />
            <span className="truncate italic">
              {lang === 'fr' ? '— Silence' : '— Silêncio'}
            </span>
          </div>
          {!isFollowingMaster && activePatternId === null && (
            <span className="text-xs font-bold text-[#8b2a1a] dark:text-[#f39c12] ml-2 shrink-0">
              ✓
            </span>
          )}
        </button>

        {/* Séparateur si des motifs existent */}
        {patternsList.length > 0 && (
          <div className="my-0.5 border-t border-[#1a1a1a]/15 dark:border-white/15" />
        )}

        {/* Liste des motifs disponibles */}
        {patternsList.map((p, pidx) => {
          const isSelected = !isFollowingMaster && activePatternId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelect(p.id)}
              className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between transition-colors ${
                isSelected
                  ? 'bg-[#8b2a1a]/15 dark:bg-[#8b2a1a]/30 font-bold text-[#8b2a1a] dark:text-[#f39c12]'
                  : 'hover:bg-[#1a1a1a]/5 dark:hover:bg-white/5 text-[var(--cordel-text)]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 truncate">
                <span
                  className="w-3 h-3 rounded-full shrink-0 border border-black/20 shadow-xs"
                  style={{ backgroundColor: instColor }}
                />
                <span className="truncate">
                  {p.vocalMode === 'micro' ? '🎙️ ' : ''}
                  {p.name || `${lang === 'fr' ? 'Motif' : 'Padrão'} ${pidx + 1}`}
                </span>
              </div>
              {isSelected && (
                <span className="text-xs font-bold text-[#8b2a1a] dark:text-[#f39c12] ml-2 shrink-0">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
};
