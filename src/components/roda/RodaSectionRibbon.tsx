import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Repeat } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useLiveSectionIndex } from '../../hooks/useLiveSectionIndex';
import { SongSection } from '../../types';
import { filterTopLevelSections } from '../../utils/sections/resolveTopLevelSectionForMeasure';

interface RodaSectionRibbonProps {
  compact?: boolean;
  isActive?: boolean;
}

const EMPTY_SECTIONS: SongSection[] = [];

export const RodaSectionRibbon: React.FC<RodaSectionRibbonProps> = ({ compact = false, isActive = true }) => {
  const songSections = useSequencerStore((s) => s.songSections ?? EMPTY_SECTIONS);
  const isPlaying = useSequencerStore((s) => s.isPlaying);
  const loopStartMeasure = useSequencerStore((s) => s.loopStartMeasure), loopEndMeasure = useSequencerStore((s) => s.loopEndMeasure);
  const isLoopRegionActive = useSequencerStore((s) => s.isLoopRegionActive), handleClearLoop = useSequencerStore((s) => s.handleClearLoop);
  const handleSetLoopStart = useSequencerStore((s) => s.handleSetLoopStart), handleSetLoopEnd = useSequencerStore((s) => s.handleSetLoopEnd);

  const containerRef = useRef<HTMLDivElement>(null), stripRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<(HTMLButtonElement | null)[]>([]), pillCentersRef = useRef<number[]>([]);
  const lastWheelTimeRef = useRef(0);

  const macroSections = useMemo(() => filterTopLevelSections(songSections), [songSections]);
  const { activeSecIdx, activeSecIdxRef } = useLiveSectionIndex(macroSections, isActive);
  const [wheelIndex, setWheelIndex] = useState<number | null>(null);
  const targetIdx = wheelIndex !== null ? wheelIndex : activeSecIdx;
  const targetIdxRef = useRef(targetIdx);
  targetIdxRef.current = targetIdx;

  const applyStripTransform = useCallback((idx: number, animate: boolean) => {
    const strip = stripRef.current, cx = pillCentersRef.current[idx];
    if (!strip || cx === undefined) return;
    strip.style.transition = animate ? 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
    strip.style.transform = `translate3d(${-cx}px, -50%, 0)`;
  }, []);

  useEffect(() => {
    if (!isActive || macroSections.length === 0) return;
    const measurePills = () => {
      pillCentersRef.current = macroSections.map((_, i) => {
        const el = pillRefs.current[i];
        return el ? el.offsetLeft + el.offsetWidth * 0.5 : 0;
      });
      applyStripTransform(targetIdxRef.current, false);
    };
    measurePills();
    const strip = stripRef.current;
    const ro = typeof ResizeObserver !== 'undefined' && strip ? new ResizeObserver(measurePills) : null;
    ro?.observe(strip!);
    return () => ro?.disconnect();
  }, [macroSections, compact, isActive, applyStripTransform]);

  useEffect(() => { setWheelIndex((prev) => (prev !== null ? null : prev)); }, [activeSecIdx, isPlaying]);
  useEffect(() => { applyStripTransform(targetIdx, true); }, [targetIdx, applyStripTransform]);
  useEffect(() => {
    const el = containerRef.current, prevent = (e: WheelEvent) => e.preventDefault();
    el?.addEventListener('wheel', prevent, { passive: false });
    return () => el?.removeEventListener('wheel', prevent);
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (macroSections.length <= 1) return;
    const now = Date.now(), delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
    if (now - lastWheelTimeRef.current < 150 || Math.abs(delta) < 5) return;
    lastWheelTimeRef.current = now;
    setWheelIndex((prev) => {
      const cur = prev !== null ? prev : activeSecIdxRef.current;
      return delta > 0 ? Math.min(macroSections.length - 1, cur + 1) : Math.max(0, cur - 1);
    });
  };

  const handleSectionClick = (s: SongSection, idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setWheelIndex(idx);
    if (e.shiftKey && loopStartMeasure !== null) {
      handleSetLoopStart(Math.min(loopStartMeasure, s.startMeasure));
      handleSetLoopEnd(Math.max(loopEndMeasure ?? loopStartMeasure, s.endMeasure));
      return;
    }
    if (isLoopRegionActive && loopStartMeasure === s.startMeasure && loopEndMeasure === s.endMeasure) handleClearLoop();
    else { handleSetLoopStart(s.startMeasure); handleSetLoopEnd(s.endMeasure); }
  };

  if (macroSections.length === 0) return null;
  const btnHeight = compact ? 'h-[30px] min-h-[30px] px-2 text-[11px]' : 'h-[38px] min-h-[38px] px-3 text-xs';

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className={`relative overflow-hidden select-none flex items-center ${compact ? 'w-[240px] sm:w-[280px] h-[34px]' : 'w-[220px] sm:w-[320px] md:w-[420px] max-w-[50vw] h-[42px]'}`}
      style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)' }}
    >
      <div ref={stripRef} className="absolute left-1/2 top-1/2 flex items-center gap-1.5 will-change-transform" style={{ transform: 'translate3d(0px, -50%, 0)' }}>
        {macroSections.map((s, idx) => {
          const isCurrent = idx === activeSecIdx;
          const isLooped = isLoopRegionActive && loopStartMeasure !== null && loopEndMeasure !== null && s.startMeasure >= loopStartMeasure && s.endMeasure <= loopEndMeasure;
          const themeStyle = isLooped
            ? 'border-2 border-[var(--cordel-ink-dark)] bg-[var(--cordel-wood)] text-[var(--cordel-parchment-bg)] ring-1 ring-[var(--cordel-parchment-bg)] shadow-[2px_2px_0px_var(--cordel-shadow-color)]'
            : isCurrent
              ? 'border-2 border-[var(--cordel-ink-dark)] bg-[var(--cordel-ink-dark)] text-[var(--cordel-parchment-bg)] shadow-[2px_2px_0px_var(--cordel-shadow-color)]'
              : 'border-2 border-[var(--cordel-ink-dark)]/80 bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] hover:opacity-100 opacity-90';
          return (
            <button
              key={s.id}
              ref={(el) => { pillRefs.current[idx] = el; }}
              onClick={(e) => handleSectionClick(s, idx, e)}
              title={`Section "${s.name}" (${s.startMeasure + 1}-${s.endMeasure + 1})`}
              className={`${btnHeight} rounded-none flex items-center gap-1.5 shrink-0 cursor-pointer box-border font-cactus ${themeStyle}`}
              style={s.color && !isLooped && !isCurrent ? { borderBottomColor: s.color } : undefined}
            >
              {isLooped && <Repeat size={11} className="shrink-0" />}
              <span className="text-xs font-extrabold tracking-tight whitespace-nowrap truncate max-w-[110px] leading-none">{s.name}</span>
              <span className="text-[11px] font-bold tabular-nums opacity-80 font-sans leading-none">{s.startMeasure + 1}-{s.endMeasure + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
