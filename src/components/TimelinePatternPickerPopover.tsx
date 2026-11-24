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

  const isSlave = false;
  const patternsList = resolvePatternsListForTrack(targetTrack, tracks);
  const resolved = resolveActivePatternForCell(trackId, measureIdx, null, tracks);
  const activePatternId = resolved.activePattern?.id ?? null;
  const isFollowingMaster = false;

  useLayoutEffect(() => {
    if (!popoverRef.current) return;
    const r = popoverRef.current.getBoundingClientRect(), m = 8;
    let top = anchorRect.bottom + 4, left = anchorRect.left;
    if (top + r.height > window.innerHeight - m) top = anchorRect.top - r.height - 4 >= m ? anchorRect.top - r.height - 4 : Math.max(m, window.innerHeight - r.height - m);
    if (left + r.width > window.innerWidth - m) left = Math.max(m, window.innerWidth - r.width - m);
    setPos({ top, left: Math.max(m, left) });
  }, [anchorRect]);

  useEffect(() => {
    const doc = popoverRef.current?.ownerDocument || document;
    const win = doc.defaultView || window;
    const openedAt = typeof performance !== 'undefined' ? performance.now() : 0;
    const t0 = Date.now(), sc = doc.getElementById('timeline-scroll-container');
    const sL = sc?.scrollLeft || 0, sT = sc?.scrollTop || 0, wX = win.scrollX, wY = win.scrollY;

    const onDown = (e: MouseEvent | PointerEvent) => {
      if (openedAt > 0 && typeof e.timeStamp === 'number' && e.timeStamp > 0 && e.timeStamp < openedAt) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      if (triggerRef?.current?.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    const onScroll = (e: Event) => {
      if ((popoverRef.current && popoverRef.current.contains(e.target as Node)) || Date.now() - t0 < 150) return;
      const dX = sc ? Math.abs(sc.scrollLeft - sL) : Math.abs(win.scrollX - wX);
      const dY = sc ? Math.abs(sc.scrollTop - sT) : Math.abs(win.scrollY - wY);
      if (dX > 4 || dY > 4 || e.type === 'wheel') onClose();
    };

    win.addEventListener('pointerdown', onDown, { capture: true });
    win.addEventListener('mousedown', onDown, { capture: true });
    win.addEventListener('keydown', onKey, { capture: true });
    win.addEventListener('scroll', onScroll, { capture: true, passive: true });
    win.addEventListener('wheel', onScroll, { capture: true, passive: true });
    return () => {
      win.removeEventListener('pointerdown', onDown, { capture: true });
      win.removeEventListener('mousedown', onDown, { capture: true });
      win.removeEventListener('keydown', onKey, { capture: true });
      win.removeEventListener('scroll', onScroll, { capture: true });
      win.removeEventListener('wheel', onScroll, { capture: true });
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
      role="dialog"
      aria-label={trackTitle}
      className="fixed z-[100] bg-[var(--cordel-paper-surface)] text-[var(--cordel-paper-ink)] border-2 border-[var(--cordel-ink-dark)] shadow-[4px_4px_0px_var(--cordel-ink-dark)] p-1 w-[200px] select-none font-cactus animate-in fade-in zoom-in-95 duration-75"
      style={{ top: `${pos.top}px`, left: `${pos.left}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="pl-2 pr-1 py-1 border-b border-[var(--cordel-ink-dark)]/30 font-bold text-xs uppercase tracking-wider flex items-center justify-between gap-1.5 text-[var(--cordel-paper-ink)]/85">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="truncate">{trackTitle}</span>
          <span className="font-mono text-[10px] text-[var(--cordel-paper-ink)]/55 shrink-0">M{measureIdx + 1}</span>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          aria-label={lang === 'fr' ? 'Fermer' : 'Fechar'}
          title={`${lang === 'fr' ? 'Fermer' : 'Fechar'} (Esc)`}
          className="w-5 h-5 flex items-center justify-center rounded-xs text-[11px] leading-none font-sans font-bold text-[var(--cordel-paper-ink)]/75 hover:text-[var(--cordel-on-accent)] hover:bg-[var(--cordel-wood)] active:scale-95 transition-colors cursor-pointer shrink-0"
        >
          ✕
        </button>
      </div>
      <TimelinePatternPickerList patternsList={patternsList} activePatternId={activePatternId} isSlave={isSlave} isFollowingMaster={isFollowingMaster} instColor={instColor} lang={lang} onSelect={handleSelect} />
    </div>,
    document.body
  );
};
