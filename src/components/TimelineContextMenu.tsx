import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSequencerStore, isToadaBus, isToadaChild } from '../stores/useSequencerStore';
import { instrumentsConfig } from '../data';
import { TimelinePatternMiniCard } from './timeline/TimelinePatternMiniCard';
import { resolveActivePatternForCell, cloneAndIsolatePatternOnMeasure } from '../utils/timelinePatternResolver';
import { TimelineContextMenuHeader } from './timeline/TimelineContextMenuHeader';
import { TimelineContextMenuItems } from './timeline/TimelineContextMenuItems';

export const TimelineContextMenu: React.FC = () => {
  const menuData = useSequencerStore((s) => s.timelineContextMenu);
  const closeMenu = useSequencerStore((s) => s.closeTimelineContextMenu);
  const duplicate = useSequencerStore((s) => s.duplicateMeasurePattern);
  const duplicateSelectedCells = useSequencerStore((s) => s.duplicateSelectedCells);
  const selectedCells = useSequencerStore((s) => s.selectedTimelineCells);
  const repeat = useSequencerStore((s) => s.repeatPatternRange);
  const assign = useSequencerStore((s) => s.handleTimelinePatternAssign);
  const lang = useSequencerStore((s) => s.lang);
  const tracks = useSequencerStore((s) => s.tracks);
  const isLeftHanded = useSequencerStore((s) => s.isLeftHanded);
  const totalMeasures = useSequencerStore((s) => s.totalMeasures);
  const copyTimelineSelection = useSequencerStore((s) => s.copyTimelineSelection);
  const cutTimelineSelection = useSequencerStore((s) => s.cutTimelineSelection);
  const pasteTimelineClipboard = useSequencerStore((s) => s.pasteTimelineClipboard);
  const deleteSelected = useSequencerStore((s) => s.deleteSelectedTimelineCells);
  const clipboard = useSequencerStore((s) => s.timelineClipboard);
  const toadaSlots = useSequencerStore((s) => s.toadaConductorSlots);
  const deployToada = useSequencerStore((s) => s.deployToadaCycleAtMeasure);

  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!menuData) { setCoords(null); return; }
    const { activePattern } = resolveActivePatternForCell(menuData.trackId, menuData.measureIdx, menuData.patternId, useSequencerStore.getState().tracks);
    const hasCard = useSequencerStore.getState().selectedTimelineCells.length <= 1 && activePattern !== null;
    const mW = hasCard ? 240 : 190, mH = hasCard ? 440 : 290, pad = 12;
    setCoords({ x: Math.max(pad, Math.min(menuData.x, window.innerWidth - mW - pad)), y: Math.max(pad, Math.min(menuData.y, window.innerHeight - mH - pad)) });

    const onDown = (e: PointerEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) closeMenu(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeMenu(); } };
    window.addEventListener('pointerdown', onDown); window.addEventListener('keydown', onKey, { capture: true });
    return () => { window.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey, { capture: true }); };
  }, [menuData, closeMenu]);

  if (!menuData || !coords) return null;

  const targetTrack = tracks.find((t) => t.id === menuData.trackId);
  const { activePattern, ownerTrack } = resolveActivePatternForCell(menuData.trackId, menuData.measureIdx, menuData.patternId, tracks);
  const effOwner = ownerTrack || targetTrack;
  const inst = targetTrack ? instrumentsConfig[targetTrack.instrumentIdx] : null;
  const cardInst = effOwner ? instrumentsConfig[effOwner.instrumentIdx] : inst;
  const trackTitle = targetTrack?.customName || inst?.name || (lang === 'fr' ? 'Piste' : 'Faixa');
  const isSlave = Boolean(targetTrack?.linkedToTrackId && !targetTrack.isLinkFolder && !targetTrack.isLinkMaster);
  const isOverridden = isSlave && targetTrack?.patternOverrides?.[menuData.measureIdx] !== undefined;
  const hasMulti = selectedCells.length > 1;
  const isToada = Boolean(targetTrack && (isToadaBus(targetTrack) || isToadaChild(targetTrack, tracks) || instrumentsConfig[targetTrack.instrumentIdx]?.id === 'puxador' || instrumentsConfig[targetTrack.instrumentIdx]?.id === 'coro' || String(targetTrack.id) === 'toada'));

  const handleDeployToada = () => {
    deployToada(menuData.measureIdx); closeMenu();
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success', message: lang === 'fr' ? `Tour de Toada déroulé dès M${menuData.measureIdx + 1}` : `Toada desenrolada a partir de M${menuData.measureIdx + 1}` } }));
  };

  const handleMakeUniqueAndEdit = () => {
    if (!activePattern || !effOwner || !targetTrack) return;
    closeMenu(); useSequencerStore.getState().pushUndoState();
    const { updatedTracks, newPatternId } = cloneAndIsolatePatternOnMeasure(effOwner, targetTrack, activePattern, menuData.measureIdx, totalMeasures, lang, useSequencerStore.getState().tracks);
    useSequencerStore.getState().setTracks(updatedTracks);
    useSequencerStore.getState().setSelectedPatternId(effOwner.id, newPatternId);
    useSequencerStore.getState().setEditingTrackId(effOwner.id);
  };

  return createPortal(
    <div
      ref={menuRef}
      className={`fixed z-50 bg-[#f4ecd8] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[4px_4px_0px_#1a1a1a] p-1.5 ${!hasMulti && activePattern ? 'w-[240px]' : 'min-w-[190px]'} max-h-[calc(100vh-24px)] overflow-y-auto select-none text-xs font-cactus animate-in fade-in zoom-in-95 duration-75`}
      style={{ left: `${coords.x}px`, top: `${coords.y}px` }}
      onClick={(e) => e.stopPropagation()} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      <TimelineContextMenuHeader trackTitle={trackTitle} hasMultiSelect={hasMulti} selectedCellsCount={selectedCells.length} measureIdx={menuData.measureIdx} lang={lang} />
      {!hasMulti && activePattern && effOwner && (
        <>
          <TimelinePatternMiniCard pattern={activePattern} track={effOwner} inst={cardInst} measureIdx={menuData.measureIdx} lang={lang} isLeftHanded={isLeftHanded} onEditPattern={() => { closeMenu(); useSequencerStore.getState().setSelectedPatternId(effOwner.id, activePattern.id); useSequencerStore.getState().setEditingTrackId(effOwner.id); }} onMakeUniqueAndEdit={handleMakeUniqueAndEdit} />
          <div className="my-1 border-b border-[#1a1a1a]/30" />
        </>
      )}
      <TimelineContextMenuItems
        hasMultiSelect={hasMulti} selectedCellsCount={selectedCells.length} timelineClipboard={clipboard}
        showToadaDeploy={!hasMulti && isToada && Boolean(toadaSlots?.length)} measureIdx={menuData.measureIdx}
        isOverridden={isOverridden} lang={lang}
        onCopy={() => { if (!hasMulti) useSequencerStore.getState().setActiveTimelineCell({ trackId: menuData.trackId, measureIdx: menuData.measureIdx }); copyTimelineSelection(); closeMenu(); }}
        onCut={() => { if (!hasMulti) useSequencerStore.getState().setActiveTimelineCell({ trackId: menuData.trackId, measureIdx: menuData.measureIdx }); cutTimelineSelection(); closeMenu(); }}
        onPaste={() => { if (!clipboard) return; useSequencerStore.getState().setActiveTimelineCell({ trackId: menuData.trackId, measureIdx: menuData.measureIdx }); pasteTimelineClipboard(); closeMenu(); }}
        onDuplicate={() => { if (hasMulti) duplicateSelectedCells(); else { duplicate(menuData.trackId, menuData.measureIdx, menuData.measureIdx + 1); useSequencerStore.getState().setActiveTimelineCell({ trackId: menuData.trackId, measureIdx: menuData.measureIdx + 1 }); } closeMenu(); }}
        onRepeat={(count) => { repeat(menuData.trackId, menuData.measureIdx, count); closeMenu(); }}
        onDeployToada={handleDeployToada} onResetToMaster={() => { assign(menuData.trackId, undefined, menuData.measureIdx); closeMenu(); }}
        onClear={() => { deleteSelected(); closeMenu(); }}
      />
    </div>,
    document.body
  );
};
