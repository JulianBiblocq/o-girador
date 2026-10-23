/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useLayoutEffect, useState, useMemo } from 'react';
import { Repeat } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { SongSection } from '../../types';
import { filterTopLevelSections } from '../../utils/sections/resolveTopLevelSectionForMeasure';

interface RodaSectionRibbonProps {
  compact?: boolean;
}

export const RodaSectionRibbon: React.FC<RodaSectionRibbonProps> = ({ compact = false }) => {
  const songSections = useSequencerStore(s => s.songSections || []);
  const currentMeasure = useSequencerStore(s => s.currentMeasure), isPlaying = useSequencerStore(s => s.isPlaying);
  const loopStartMeasure = useSequencerStore(s => s.loopStartMeasure), loopEndMeasure = useSequencerStore(s => s.loopEndMeasure);
  const isLoopRegionActive = useSequencerStore(s => s.isLoopRegionActive), handleClearLoop = useSequencerStore(s => s.handleClearLoop);
  const handleSetLoopStart = useSequencerStore(s => s.handleSetLoopStart), handleSetLoopEnd = useSequencerStore(s => s.handleSetLoopEnd);

  const containerRef = useRef<HTMLDivElement>(null), pillRefs = useRef<(HTMLButtonElement | null)[]>([]), lastWheelTimeRef = useRef(0);
  const [wheelIndex, setWheelIndex] = useState<number | null>(null), [translateX, setTranslateX] = useState(0), [isReady, setIsReady] = useState(false);

  // 1. Zéro chevauchement : filtre glouton par portée décroissante (logique partagée)
  const macroSections = useMemo(() => filterTopLevelSections(songSections), [songSections]);

  const activeIdx = useMemo(() => {
    const idx = macroSections.findIndex(s => currentMeasure >= s.startMeasure && currentMeasure <= s.endMeasure);
    return idx >= 0 ? idx : 0;
  }, [macroSections, currentMeasure]);

  const targetIdx = wheelIndex !== null ? wheelIndex : activeIdx;

  // Centrage strict de la section active sur 50% (au-dessus du 1 de la Roda)
  useLayoutEffect(() => {
    const update = () => {
      const pill = pillRefs.current[targetIdx];
      if (pill) { setTranslateX(-(pill.offsetLeft + pill.offsetWidth / 2)); setIsReady(true); }
    };
    update();
    const container = containerRef.current;
    let ro: ResizeObserver | null = typeof ResizeObserver !== 'undefined' && container ? new ResizeObserver(update) : null;
    ro?.observe(container!);
    window.addEventListener('resize', update);
    return () => { ro?.disconnect(); window.removeEventListener('resize', update); };
  }, [targetIdx, macroSections]);

  useEffect(() => { setWheelIndex(null); }, [activeIdx, isPlaying]);
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
    setWheelIndex(prev => {
      const cur = prev !== null ? prev : activeIdx;
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

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className={`relative overflow-hidden select-none flex items-center ${compact ? 'w-[240px] sm:w-[280px] h-[34px]' : 'w-[220px] sm:w-[320px] md:w-[420px] max-w-[50vw] h-[42px]'}`}
      style={{
        maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
      }}
    >
      <div
        className={`absolute left-1/2 top-1/2 flex items-center gap-1.5 will-change-transform ${isReady ? 'transition-transform duration-300 ease-out' : ''}`}
        style={{ transform: `translate3d(${translateX}px, -50%, 0)` }}
      >
        {macroSections.map((s, idx) => {
          const isCurrent = currentMeasure >= s.startMeasure && currentMeasure <= s.endMeasure;
          const isLooped = isLoopRegionActive && loopStartMeasure !== null && loopEndMeasure !== null && s.startMeasure >= loopStartMeasure && s.endMeasure <= loopEndMeasure;
          const themeStyle = isLooped
            ? 'border-2 border-[#1a1a1a] bg-[#8b2a1a] text-[#f4ecd8] ring-1 ring-[#f4ecd8] shadow-[2px_2px_0px_#000]'
            : isCurrent
            ? 'border-2 border-[#1a1a1a] bg-[#1a1a1a] text-[#f4ecd8] shadow-[2px_2px_0px_rgba(0,0,0,0.25)]'
            : 'border border-[#1a1a1a]/80 border-b-[3px] bg-[#f4ecd8] dark:bg-[#e2d7c0] text-[#1a1a1a] hover:opacity-100 opacity-90 shadow-[1.5px_1.5px_0px_rgba(0,0,0,0.15)]';

          const btnHeight = compact ? 'h-[30px] min-h-[30px] px-2 text-[11px]' : 'h-[38px] min-h-[38px] px-3 text-xs';

          return (
            <button
              key={s.id}
              ref={el => { pillRefs.current[idx] = el; }}
              onClick={e => handleSectionClick(s, idx, e)}
              title={`Section "${s.name}" (${s.startMeasure + 1}-${s.endMeasure + 1}) — Clic pour boucler, Maj+Clic pour étendre`}
              className={`${btnHeight} rounded-none flex items-center gap-1.5 shrink-0 transition-all cursor-pointer box-border font-cactus ${themeStyle}`}
              style={s.color && !isLooped && !isCurrent ? { borderBottomColor: s.color } : undefined}
            >
              {isLooped && <Repeat size={11} className="shrink-0 animate-pulse" />}
              <span className="text-xs font-extrabold tracking-tight whitespace-nowrap truncate max-w-[110px] leading-none">{s.name}</span>
              <span className="text-[11px] font-bold tabular-nums opacity-80 font-sans leading-none">{s.startMeasure + 1}-{s.endMeasure + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
