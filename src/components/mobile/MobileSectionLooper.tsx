/**
 * Ruban dynamique des sections scrollable au doigt et auto-centré à 12h (< 120 lignes).
 */
import React, { useRef, useEffect, useMemo } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { SongSection } from '../../types';
import { filterTopLevelSections } from '../../utils/sections/resolveTopLevelSectionForMeasure';
import { Repeat } from 'lucide-react';

interface Props {
  isPlaying: boolean;
  onNavigateMeasure?: (m: number) => void;
}

export const MobileSectionLooper: React.FC<Props> = ({ isPlaying, onNavigateMeasure }) => {
  const songSections = useSequencerStore((s) => s.songSections || []);
  const currentMeasure = useSequencerStore((s) => s.currentMeasure);
  const loopStartMeasure = useSequencerStore((s) => s.loopStartMeasure);
  const loopEndMeasure = useSequencerStore((s) => s.loopEndMeasure);
  const isLoopRegionActive = useSequencerStore((s) => s.isLoopRegionActive);
  const setLoopStartMeasure = useSequencerStore((s) => s.setLoopStartMeasure);
  const setLoopEndMeasure = useSequencerStore((s) => s.setLoopEndMeasure);
  const setIsLoopRegionActive = useSequencerStore((s) => s.setIsLoopRegionActive);
  const setPendingLoopRange = useSequencerStore((s) => s.setPendingLoopRange);

  const containerRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const topSections = useMemo(() => filterTopLevelSections(songSections), [songSections]);

  const activeIdx = useMemo(() => {
    const idx = topSections.findIndex((s) => currentMeasure >= s.startMeasure && currentMeasure <= s.endMeasure);
    return idx >= 0 ? idx : 0;
  }, [topSections, currentMeasure]);

  useEffect(() => {
    const container = containerRef.current;
    const pill = pillRefs.current[activeIdx];
    if (container && pill) {
      const targetScrollLeft = pill.offsetLeft + pill.offsetWidth / 2 - container.clientWidth / 2;
      container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
    }
  }, [activeIdx]);

  const handleClearLoop = () => {
    setIsLoopRegionActive(false);
    setPendingLoopRange(null);
  };

  const handleSectionClick = (sec: SongSection, e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey && loopStartMeasure !== null) {
      setLoopStartMeasure(Math.min(loopStartMeasure, sec.startMeasure));
      setLoopEndMeasure(Math.max(loopEndMeasure ?? loopStartMeasure, sec.endMeasure));
      setIsLoopRegionActive(true);
      return;
    }

    if (isLoopRegionActive && loopStartMeasure === sec.startMeasure && loopEndMeasure === sec.endMeasure) {
      handleClearLoop();
    } else {
      setLoopStartMeasure(sec.startMeasure);
      setLoopEndMeasure(sec.endMeasure);
      setIsLoopRegionActive(true);
      if (!isPlaying) onNavigateMeasure?.(sec.startMeasure);
    }
  };

  return (
    <div
      ref={containerRef}
      onWheel={(e) => {
        if (!containerRef.current) return;
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          containerRef.current.scrollLeft += e.deltaY;
        }
      }}
      className="relative w-full h-10 overflow-x-auto no-scrollbar [&::-webkit-scrollbar]:hidden flex items-center touch-pan-x select-none z-30 border-b-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] gap-1.5"
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
      }}
    >
      <div className="shrink-0 w-[calc(50%-24px)]" />

      {topSections.map((sec, idx) => {
        const isCurrent = currentMeasure >= sec.startMeasure && currentMeasure <= sec.endMeasure;
        const isLooped = isLoopRegionActive && loopStartMeasure !== null && loopEndMeasure !== null && sec.startMeasure >= loopStartMeasure && sec.endMeasure <= loopEndMeasure;

        const themeStyle = isLooped
          ? 'bg-[#8b2a1a] text-[#f4ecd8] border-black ring-1 ring-[#f4ecd8] shadow-[2px_2px_0px_#000]'
          : isCurrent
          ? 'bg-[#c25e38] text-[#f4ecd8] border-black shadow-[2px_2px_0px_#000]'
          : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)] hover:border-[#b94a2c] shadow-[1px_1px_0px_#000]';

        return (
          <button
            key={sec.id}
            ref={(el) => { pillRefs.current[idx] = el; }}
            onClick={(e) => handleSectionClick(sec, e)}
            className={`h-7 min-h-[28px] px-2.5 text-xs font-cactus font-bold uppercase border-2 shrink-0 flex items-center gap-1 transition-all cursor-pointer ${themeStyle}`}
            title={`${sec.name} (${sec.startMeasure + 1}-${sec.endMeasure + 1}) — Clic: loop / Maj+Clic: étendre`}
          >
            {isLooped && <Repeat size={10} className="shrink-0 animate-pulse" />}
            <span className="whitespace-nowrap truncate max-w-[120px]">{sec.name}</span>
            <span className="text-[9px] font-mono opacity-80 whitespace-nowrap">M{sec.startMeasure + 1}-{sec.endMeasure + 1}</span>
          </button>
        );
      })}

      <div className="shrink-0 w-[calc(50%-24px)]" />
    </div>
  );
};
