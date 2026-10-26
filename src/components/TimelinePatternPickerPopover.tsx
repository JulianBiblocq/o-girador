import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSequencerStore } from '../stores/useSequencerStore';
import { instrumentsConfig } from '../data';
import { checkAndTriggerToadaQuickPrompt } from '../utils/toadaArrangement';
import { TimelinePatternPickerList } from './timeline/TimelinePatternPickerList';
import { resolvePatternsListForTrack, resolveActivePatternForCell } from '../utils/timelinePatternResolver';
import { isSlaveTrack } from '../utils/trackMasterResolver';

export interface TimelinePatternPickerPopoverProps {
  trackId: number; measureIdx: number; anchorRect: DOMRect; triggerRef?: React.RefObject<HTMLElement | null>; onClose: () => void;
}

export const TimelinePatternPickerPopover: React.FC<TimelinePatternPickerPopoverProps> = ({
  trackId, measureIdx, anchorRect, triggerRef, onClose,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: anchorRect.bottom + 4, left: Math.max(8, Math.min(anchorRect.left, window.innerWidth - 200)) });

  const tracks = useSequencerStore((s) => s.tracks);
  const assign = useSequencerStore((s) => s.handleTimelinePatternAssign);
  const lang = useSequencerStore((s) => s.lang);

  const targetTrack = tracks.find((t) => t.id === trackId);
  const inst = targetTrack ? instrumentsConfig[targetTrack.instrumentIdx] : null;
  const trackTitle = targetTrack?.customName || inst?.name || (lang === 'fr' ? 'Piste' : 'Faixa');
  const instColor = inst?.colors?.['D'] || inst?.color || inst?.mixerBg || '#e67e22';

  const isSlave = isSlaveTrack(targetTrack, tracks);
  const patternsList = resolvePatternsListForTrack(targetTrack, tracks);
  const resolved = resolveActivePatternForCell(trackId, measureIdx, null, tracks);
  const activePatternId = resolved.activePattern?.id ?? null;
  const isFollowingMaster = isSlave && targetTrack?.patternOverrides?.[measureIdx] === undefined;

  useLayoutEffect(() => {
    if (!popoverRef.current) return;
    const r = popoverRef.current.getBoundingClientRect(), m = 8;
    let top = anchorRect.bottom + 4, left = anchorRect.left;
    if (top + r.height > window.innerHeight - m) top = anchorRect.top - r.height - 4 >= m ? anchorRect.top - r.height - 4 : Math.max(m, window.innerHeight - r.height - m);
    if (left + r.width > window.innerWidth - m) left = Math.max(m, window.innerWidth - r.width - m);
    setPos({ top, left: Math.max(m, left) });
  }, [anchorRect]);

  useEffect(() => {
    let attached = false;
    const t0 = Date.now(), sc = document.getElementById('timeline-scroll-container');
    const sL = sc?.scrollLeft || 0, sT = sc?.scrollTop || 0, wX = window.scrollX, wY = window.scrollY;

    const onDown = (e: MouseEvent | PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      if (triggerRef?.current?.contains(target)) return;
      if (attached) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); onClose(); } };
    const onScroll = (e: Event) => {
      if ((popoverRef.current && popoverRef.current.contains(e.target as Node)) || Date.now() - t0 < 150) return;
      const dX = sc ? Math.abs(sc.scrollLeft - sL) : Math.abs(window.scrollX - wX);
      const dY = sc ? Math.abs(sc.scrollTop - sT) : Math.abs(window.scrollY - wY);
      if (dX > 4 || dY > 4 || e.type === 'wheel') onClose();
    };

    const timer = setTimeout(() => { attached = true; }, 150);
    window.addEventListener('pointerdown', onDown); window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey, { capture: true });
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('wheel', onScroll, { capture: true, passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', onDown); window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey, { capture: true });
      window.removeEventListener('scroll', onScroll, { capture: true }); window.removeEventListener('wheel', onScroll, { capture: true });
    };
  }, [onClose, triggerRef]);

  const handleSelect = (pId: number | null | undefined) => {
    useSequencerStore.getState().setActiveTimelineCell({ trackId, measureIdx });
    assign(trackId, pId, measureIdx);
    onClose();
    if (typeof pId === 'number') checkAndTriggerToadaQuickPrompt(useSequencerStore.getState(), trackId, pId, measureIdx);
  };

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-[100] bg-[#f4ecd8] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[4px_4px_0px_#1a1a1a] p-1 w-[200px] select-none font-cactus animate-in fade-in zoom-in-95 duration-75"
      style={{ top: `${pos.top}px`, left: `${pos.left}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-2 py-1 border-b border-[#1a1a1a]/30 font-bold text-xs uppercase tracking-wider flex items-center justify-between !text-[#1a1a1a]/80">
        <span className="truncate">{trackTitle}</span>
        <span className="font-mono text-[10px] !text-[#1a1a1a]/50">M{measureIdx + 1}</span>
      </div>
      <TimelinePatternPickerList patternsList={patternsList} activePatternId={activePatternId} isSlave={isSlave} isFollowingMaster={isFollowingMaster} instColor={instColor} lang={lang} onSelect={handleSelect} />
    </div>,
    document.body
  );
};
