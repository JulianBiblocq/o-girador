import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSequencerStore } from '../stores/useSequencerStore';
import { Copy, Scissors, Clipboard, CopyPlus, Repeat, Trash2, Link } from 'lucide-react';
import { instrumentsConfig } from '../data';
import { Pattern } from '../types';
import { TimelinePatternMiniCard } from './timeline/TimelinePatternMiniCard';
import { resolveActivePatternForCell, cloneAndIsolatePatternOnMeasure } from '../utils/timelinePatternResolver';

export const TimelineContextMenu: React.FC = () => {
  const menuData = useSequencerStore((state) => state.timelineContextMenu);
  const closeMenu = useSequencerStore((state) => state.closeTimelineContextMenu);
  const duplicate = useSequencerStore((state) => state.duplicateMeasurePattern);
  const duplicateSelectedCells = useSequencerStore((state) => state.duplicateSelectedCells);
  const selectedTimelineCells = useSequencerStore((state) => state.selectedTimelineCells);
  const repeat = useSequencerStore((state) => state.repeatPatternRange);
  const assign = useSequencerStore((state) => state.handleTimelinePatternAssign);
  const lang = useSequencerStore((state) => state.lang);
  const tracks = useSequencerStore((state) => state.tracks);
  const isLeftHanded = useSequencerStore((state) => state.isLeftHanded);
  const totalMeasures = useSequencerStore((state) => state.totalMeasures);
  const copyTimelineSelection = useSequencerStore((state) => state.copyTimelineSelection);
  const cutTimelineSelection = useSequencerStore((state) => state.cutTimelineSelection);
  const pasteTimelineClipboard = useSequencerStore((state) => state.pasteTimelineClipboard);
  const deleteSelectedTimelineCells = useSequencerStore((state) => state.deleteSelectedTimelineCells);
  const timelineClipboard = useSequencerStore((state) => state.timelineClipboard);

  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  // Close on Escape or click outside
  useEffect(() => {
    if (!menuData) {
      setCoords(null);
      return;
    }

    // Viewport collision adjustment (prend en compte la présence d'un motif pour le gabarit)
    const { activePattern: previewPattern } = resolveActivePatternForCell(
      menuData.trackId,
      menuData.measureIdx,
      menuData.patternId,
      useSequencerStore.getState().tracks
    );
    const isMulti = useSequencerStore.getState().selectedTimelineCells.length > 1;
    const hasPatternCard = !isMulti && previewPattern !== null;

    const menuWidth = hasPatternCard ? 240 : 190;
    const menuHeight = hasPatternCard ? 440 : 290;
    const padding = 12;

    const safeX = Math.max(padding, Math.min(menuData.x, window.innerWidth - menuWidth - padding));
    const safeY = Math.max(padding, Math.min(menuData.y, window.innerHeight - menuHeight - padding));
    setCoords({ x: safeX, y: safeY });

    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuData, closeMenu]);

  if (!menuData || !coords) return null;

  const targetTrack = tracks.find((t) => t.id === menuData.trackId);
  const { activePattern, ownerTrack } = resolveActivePatternForCell(
    menuData.trackId,
    menuData.measureIdx,
    menuData.patternId,
    tracks
  );
  const effectiveOwnerTrack = ownerTrack || targetTrack;
  const instInfo = targetTrack ? instrumentsConfig[targetTrack.instrumentIdx] : null;
  const cardInst = effectiveOwnerTrack ? instrumentsConfig[effectiveOwnerTrack.instrumentIdx] : instInfo;
  const trackTitle = targetTrack?.customName || instInfo?.name || (lang === 'fr' ? 'Piste' : 'Faixa');

  const isSlave = !!(targetTrack?.linkedToTrackId && !targetTrack.isLinkFolder && !targetTrack.isLinkMaster);
  const isOverridden = isSlave && targetTrack?.patternOverrides?.[menuData.measureIdx] !== undefined;

  const hasMultiSelect = selectedTimelineCells.length > 1;
  const hasPattern = !hasMultiSelect && activePattern !== null;

  const handleEditPattern = () => {
    if (!activePattern || !effectiveOwnerTrack) return;
    closeMenu();
    useSequencerStore.getState().setSelectedPatternId(effectiveOwnerTrack.id, activePattern.id);
    useSequencerStore.getState().setEditingTrackId(effectiveOwnerTrack.id);
  };

  const handleMakeUniqueAndEdit = () => {
    if (!activePattern || !effectiveOwnerTrack || !targetTrack) return;
    closeMenu();
    useSequencerStore.getState().pushUndoState();

    const { updatedTracks, newPatternId } = cloneAndIsolatePatternOnMeasure(
      effectiveOwnerTrack,
      targetTrack,
      activePattern,
      menuData.measureIdx,
      totalMeasures,
      lang,
      useSequencerStore.getState().tracks
    );

    useSequencerStore.getState().setTracks(updatedTracks);
    useSequencerStore.getState().setSelectedPatternId(effectiveOwnerTrack.id, newPatternId);
    useSequencerStore.getState().setEditingTrackId(effectiveOwnerTrack.id);
  };

  const handleCopy = () => {
    if (!hasMultiSelect) {
      useSequencerStore.getState().setActiveTimelineCell({
        trackId: menuData.trackId,
        measureIdx: menuData.measureIdx,
      });
    }
    copyTimelineSelection();
    closeMenu();
  };

  const handleCut = () => {
    if (!hasMultiSelect) {
      useSequencerStore.getState().setActiveTimelineCell({
        trackId: menuData.trackId,
        measureIdx: menuData.measureIdx,
      });
    }
    cutTimelineSelection();
    closeMenu();
  };

  const handlePaste = () => {
    if (!timelineClipboard) return;
    useSequencerStore.getState().setActiveTimelineCell({
      trackId: menuData.trackId,
      measureIdx: menuData.measureIdx,
    });
    pasteTimelineClipboard();
    closeMenu();
  };

  const handleDuplicate = () => {
    if (hasMultiSelect) {
      duplicateSelectedCells();
    } else {
      duplicate(menuData.trackId, menuData.measureIdx, menuData.measureIdx + 1);
      useSequencerStore.getState().setActiveTimelineCell({
        trackId: menuData.trackId,
        measureIdx: menuData.measureIdx + 1,
      });
    }
    closeMenu();
  };

  const handleRepeat = (count: number) => {
    repeat(menuData.trackId, menuData.measureIdx, count);
    closeMenu();
  };

  const handleResetToMaster = () => {
    assign(menuData.trackId, undefined, menuData.measureIdx);
    closeMenu();
  };

  const handleClear = () => {
    deleteSelectedTimelineCells();
    closeMenu();
  };

  return createPortal(
    <div
      ref={menuRef}
      className={`fixed z-50 bg-[#f4ecd8] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[4px_4px_0px_#1a1a1a] p-1.5 ${
        hasPattern ? 'w-[240px]' : 'min-w-[190px]'
      } max-h-[calc(100vh-24px)] overflow-y-auto select-none text-xs font-cactus animate-in fade-in zoom-in-95 duration-75`}
      style={{ left: `${coords.x}px`, top: `${coords.y}px` }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* Menu Header (Cordel Style) */}
      <div className="px-2 py-1 mb-1.5 border-b-2 border-[#1a1a1a] font-bold text-[11px] tracking-wider uppercase flex items-center justify-between text-[#1a1a1a]">
        <span className="truncate max-w-[120px]" title={hasMultiSelect ? (lang === 'fr' ? 'Multi-Sélection' : 'Multi-Seleção') : trackTitle}>
          {hasMultiSelect ? (lang === 'fr' ? 'Multi-Sélection' : 'Multi-Seleção') : trackTitle}
        </span>
        <span className="bg-[#1a1a1a] text-[#f4ecd8] px-1.5 py-0.5 rounded-none text-[10px] font-sans font-black">
          {hasMultiSelect ? `${selectedTimelineCells.length} ${lang === 'fr' ? 'mes.' : 'comp.'}` : `M${menuData.measureIdx + 1}`}
        </span>
      </div>

      {/* Mini-Carte Cordel d'aperçu de motif + Actions d'édition (si motif présent et pas de multi-sélection) */}
      {hasPattern && activePattern && (
        <>
          <TimelinePatternMiniCard
            pattern={activePattern}
            track={effectiveOwnerTrack}
            inst={cardInst}
            measureIdx={menuData.measureIdx}
            lang={lang}
            isLeftHanded={isLeftHanded}
            onEditPattern={handleEditPattern}
            onMakeUniqueAndEdit={handleMakeUniqueAndEdit}
          />
          <div className="my-1 border-b border-[#1a1a1a]/30" />
        </>
      )}

      {/* Action: Copier */}
      <button
        type="button"
        onClick={handleCopy}
        className="w-full text-left px-2 py-1.5 font-bold flex items-center justify-between transition-all hover:bg-[#1a1a1a] hover:text-[#f4ecd8] active:translate-x-0.5 cursor-pointer text-xs group"
      >
        <div className="flex items-center gap-2">
          <Copy size={13} className="shrink-0" />
          <span>
            {hasMultiSelect
              ? (lang === 'fr' ? `Copier la sélection (${selectedTimelineCells.length})` : `Copiar seleção (${selectedTimelineCells.length})`)
              : (lang === 'fr' ? 'Copier' : 'Copiar')}
          </span>
        </div>
        <span className="text-[9px] font-sans opacity-60 font-semibold group-hover:text-[#f4ecd8] group-hover:opacity-90">
          Ctrl+C
        </span>
      </button>

      {/* Action: Couper */}
      <button
        type="button"
        onClick={handleCut}
        className="w-full text-left px-2 py-1.5 font-bold flex items-center justify-between transition-all hover:bg-[#1a1a1a] hover:text-[#f4ecd8] active:translate-x-0.5 cursor-pointer text-xs group"
      >
        <div className="flex items-center gap-2">
          <Scissors size={13} className="shrink-0" />
          <span>
            {hasMultiSelect
              ? (lang === 'fr' ? `Couper la sélection (${selectedTimelineCells.length})` : `Recortar seleção (${selectedTimelineCells.length})`)
              : (lang === 'fr' ? 'Couper' : 'Recortar')}
          </span>
        </div>
        <span className="text-[9px] font-sans opacity-60 font-semibold group-hover:text-[#f4ecd8] group-hover:opacity-90">
          Ctrl+X
        </span>
      </button>

      {/* Action: Coller */}
      <button
        type="button"
        disabled={!timelineClipboard}
        onClick={handlePaste}
        className={`w-full text-left px-2 py-1.5 font-bold flex items-center justify-between transition-all text-xs group ${
          timelineClipboard
            ? 'hover:bg-[#1a1a1a] hover:text-[#f4ecd8] active:translate-x-0.5 cursor-pointer'
            : 'opacity-40 cursor-not-allowed'
        }`}
      >
        <div className="flex items-center gap-2">
          <Clipboard size={13} className="shrink-0" />
          <span>
            {timelineClipboard
              ? (lang === 'fr' ? `Coller (${timelineClipboard.spanMeasures} mes.)` : `Colar (${timelineClipboard.spanMeasures} comp.)`)
              : (lang === 'fr' ? 'Coller' : 'Colar')}
          </span>
        </div>
        <span className="text-[9px] font-sans opacity-60 font-semibold group-hover:text-[#f4ecd8] group-hover:opacity-90">
          Ctrl+V
        </span>
      </button>

      <div className="my-1 border-b border-[#1a1a1a]/30" />

      {/* Action: Dupliquer */}
      <button
        type="button"
        onClick={handleDuplicate}
        className="w-full text-left px-2 py-1.5 font-bold flex items-center justify-between transition-all hover:bg-[#1a1a1a] hover:text-[#f4ecd8] active:translate-x-0.5 cursor-pointer text-xs group"
      >
        <div className="flex items-center gap-2">
          <CopyPlus size={13} className="shrink-0" />
          <span>
            {hasMultiSelect
              ? (lang === 'fr' ? `Dupliquer la sélection (${selectedTimelineCells.length} mes.)` : `Duplicar seleção (${selectedTimelineCells.length} comp.)`)
              : (lang === 'fr' ? 'Dupliquer' : 'Duplicar')}
          </span>
        </div>
        <span className="text-[9px] font-sans opacity-60 font-semibold group-hover:text-[#f4ecd8] group-hover:opacity-90">
          Ctrl+D
        </span>
      </button>

      {/* Action: Répéter (mesure unique) */}
      {!hasMultiSelect && (
        <>
          <button
            type="button"
            onClick={() => handleRepeat(2)}
            className="w-full text-left px-2 py-1.5 font-bold flex items-center gap-2 transition-all hover:bg-[#1a1a1a] hover:text-[#f4ecd8] active:translate-x-0.5 cursor-pointer text-xs"
          >
            <Repeat size={13} className="shrink-0" />
            <span>{lang === 'fr' ? 'Répéter ×2' : 'Repetir ×2'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleRepeat(4)}
            className="w-full text-left px-2 py-1.5 font-bold flex items-center gap-2 transition-all hover:bg-[#1a1a1a] hover:text-[#f4ecd8] active:translate-x-0.5 cursor-pointer text-xs"
          >
            <Repeat size={13} className="shrink-0" />
            <span>{lang === 'fr' ? 'Répéter ×4' : 'Repetir ×4'}</span>
          </button>
        </>
      )}

      <div className="my-1 border-b border-[#1a1a1a]/30" />

      {/* Action: Suivre le maître (for overridden slave track) */}
      {!hasMultiSelect && isOverridden && (
        <button
          type="button"
          onClick={handleResetToMaster}
          className="w-full text-left px-2 py-1.5 font-bold flex items-center gap-2 transition-all hover:bg-[#1a1a1a] hover:text-[#f4ecd8] active:translate-x-0.5 cursor-pointer text-xs text-blue-800 hover:text-[#f4ecd8]"
        >
          <Link size={13} className="shrink-0" />
          <span>{lang === 'fr' ? 'Suivre le maître' : 'Seguir mestre'}</span>
        </button>
      )}

      {/* Action: Effacer */}
      <button
        type="button"
        onClick={handleClear}
        className="w-full text-left px-2 py-1.5 font-bold flex items-center gap-2 transition-all hover:bg-[#b71515] hover:text-white active:translate-x-0.5 cursor-pointer text-xs text-[#b71515]"
      >
        <Trash2 size={13} className="shrink-0" />
        <span>
          {hasMultiSelect
            ? (lang === 'fr' ? `Effacer la sélection (${selectedTimelineCells.length})` : `Limpar seleção (${selectedTimelineCells.length})`)
            : (lang === 'fr' ? 'Effacer le motif' : 'Limpar padrão')}
        </span>
      </button>
    </div>,
    document.body
  );
};
