/**
 * Ruban dynamique des sections scrollable au doigt et auto-centré à 12h sans reflow en lecture (< 125 lignes).
 */
import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { getLastAudibleTick, getLiveOrStoreMeasure, subscribeToTick, unsubscribeFromTick } from '../../audio/visualTickBuffer';
import { SongSection } from '../../types';
import { filterTopLevelSections } from '../../utils/sections/resolveTopLevelSectionForMeasure';
import { Repeat } from 'lucide-react';

interface Props {
  isPlaying: boolean;
  onNavigateMeasure?: (m: number) => void;
}

export const MobileSectionLooper: React.FC<Props> = ({ isPlaying, onNavigateMeasure }) => {
  const songSections = useSequencerStore((s) => s.songSections || []);
  const storeMeasure = useSequencerStore((s) => s.currentMeasure);
  const loopStartMeasure = useSequencerStore((s) => s.loopStartMeasure);
  const loopEndMeasure = useSequencerStore((s) => s.loopEndMeasure);
  const isLoopRegionActive = useSequencerStore((s) => s.isLoopRegionActive);
  const setLoopStartMeasure = useSequencerStore((s) => s.setLoopStartMeasure);
  const setLoopEndMeasure = useSequencerStore((s) => s.setLoopEndMeasure);
  const setIsLoopRegionActive = useSequencerStore((s) => s.setIsLoopRegionActive);
  const setPendingLoopRange = useSequencerStore((s) => s.setPendingLoopRange);

  const containerRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const layoutCacheRef = useRef<{ containerW: number; pillCenters: number[] }>({ containerW: 0, pillCenters: [] });

  const topSections = useMemo(() => filterTopLevelSections(songSections), [songSections]);
  const findSecIdx = useCallback((m: number) => {
    const idx = topSections.findIndex((s) => m >= s.startMeasure && m <= s.endMeasure);
    return idx >= 0 ? idx : 0;
  }, [topSections]);

  const [activeIdx, setActiveIdx] = useState<number>(() => findSecIdx(getLiveOrStoreMeasure(storeMeasure)));
  const activeIdxRef = useRef(activeIdx);
  activeIdxRef.current = activeIdx;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || topSections.length === 0) return;
    const measureLayout = () => {
      layoutCacheRef.current = {
        containerW: container.clientWidth,
        pillCenters: topSections.map((_, i) => {
          const el = pillRefs.current[i];
          return el ? el.offsetLeft + el.offsetWidth * 0.5 : 0;
        }),
      };
      const cx = layoutCacheRef.current.pillCenters[activeIdxRef.current];
      if (cx !== undefined && layoutCacheRef.current.containerW > 0) {
        container.scrollLeft = Math.max(0, cx - layoutCacheRef.current.containerW * 0.5);
      }
    };
    measureLayout();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measureLayout) : null;
    ro?.observe(container);
    return () => ro?.disconnect();
  }, [topSections]);

  useEffect(() => {
    const container = containerRef.current;
    const { containerW, pillCenters } = layoutCacheRef.current;
    const cx = pillCenters[activeIdx];
    if (container && cx !== undefined && containerW > 0) {
      container.scrollLeft = Math.max(0, cx - containerW * 0.5);
    }
  }, [activeIdx]);

  useEffect(() => { if (!isPlaying) setActiveIdx(findSecIdx(storeMeasure)); }, [isPlaying, storeMeasure, findSecIdx]);

  useEffect(() => {
    if (!isPlaying || topSections.length === 0) return;
    const syncSec = (m: number) => {
      const next = findSecIdx(m);
      if (next !== activeIdxRef.current) { activeIdxRef.current = next; setActiveIdx(next); }
    };
    const last = getLastAudibleTick();
    if (last && last.step >= 0 && !last.isPreRoll) syncSec(last.measure);
    const onTick = (evt: any) => { if (evt && evt.step >= 0 && !evt.isPreRoll) syncSec(evt.measure ?? 0); };
    subscribeToTick(onTick);
    return () => unsubscribeFromTick(onTick);
  }, [isPlaying, topSections, findSecIdx]);

  const handleSectionClick = (sec: SongSection, e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey && loopStartMeasure !== null) {
      setLoopStartMeasure(Math.min(loopStartMeasure, sec.startMeasure));
      setLoopEndMeasure(Math.max(loopEndMeasure ?? loopStartMeasure, sec.endMeasure));
      setIsLoopRegionActive(true);
      return;
    }
    if (isLoopRegionActive && loopStartMeasure === sec.startMeasure && loopEndMeasure === sec.endMeasure) {
      setIsLoopRegionActive(false); setPendingLoopRange(null);
    } else {
      setLoopStartMeasure(sec.startMeasure); setLoopEndMeasure(sec.endMeasure); setIsLoopRegionActive(true);
      if (!isPlaying) onNavigateMeasure?.(sec.startMeasure);
    }
  };

  return (
    <div
      ref={containerRef}
      onWheel={(e) => { if (containerRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) containerRef.current.scrollLeft += e.deltaY; }}
      className="relative w-full h-10 overflow-x-auto no-scrollbar [&::-webkit-scrollbar]:hidden flex items-center touch-pan-x select-none z-30 border-b-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] gap-1.5"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}
    >
      <div className="shrink-0 w-[calc(50%-24px)]" />
      {topSections.map((sec, idx) => {
        const isCurrent = idx === activeIdx;
        const isLooped = isLoopRegionActive && loopStartMeasure !== null && loopEndMeasure !== null && sec.startMeasure >= loopStartMeasure && sec.endMeasure <= loopEndMeasure;
        const themeStyle = isLooped
          ? 'bg-[var(--cordel-wood)] text-[var(--cordel-parchment-bg)] border-[var(--cordel-ink-dark)] ring-1 ring-[var(--cordel-parchment-bg)] shadow-[2px_2px_0px_var(--cordel-shadow-color)]'
          : isCurrent
            ? 'bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] border-[var(--cordel-ink-dark)] shadow-[2px_2px_0px_var(--cordel-shadow-color)]'
            : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)] hover:border-[var(--cordel-accent)] shadow-[1px_1px_0px_var(--cordel-shadow-color)]';
        return (
          <button
            key={sec.id}
            ref={(el) => { pillRefs.current[idx] = el; }}
            onClick={(e) => handleSectionClick(sec, e)}
            className={`h-7 min-h-[28px] px-2.5 text-xs font-cactus font-bold uppercase border-2 shrink-0 flex items-center gap-1 cursor-pointer ${themeStyle}`}
            title={`${sec.name} (${sec.startMeasure + 1}-${sec.endMeasure + 1})`}
          >
            {isLooped && <Repeat size={10} className="shrink-0" />}
            <span className="whitespace-nowrap truncate max-w-[120px]">{sec.name}</span>
            <span className="text-[9px] font-mono opacity-80 whitespace-nowrap">M{sec.startMeasure + 1}-{sec.endMeasure + 1}</span>
          </button>
        );
      })}
      <div className="shrink-0 w-[calc(50%-24px)]" />
    </div>
  );
};
