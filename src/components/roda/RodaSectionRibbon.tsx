/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useLayoutEffect, useState, useMemo } from 'react';
import { Repeat } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { SongSection } from '../../types';

export const RodaSectionRibbon: React.FC = () => {
  const songSections = useSequencerStore(s => s.songSections || []);
  const currentMeasure = useSequencerStore(s => s.currentMeasure);
  const isPlaying = useSequencerStore(s => s.isPlaying);
  const loopStartMeasure = useSequencerStore(s => s.loopStartMeasure);
  const loopEndMeasure = useSequencerStore(s => s.loopEndMeasure);
  const isLoopRegionActive = useSequencerStore(s => s.isLoopRegionActive);
  const handleSetLoopStart = useSequencerStore(s => s.handleSetLoopStart);
  const handleSetLoopEnd = useSequencerStore(s => s.handleSetLoopEnd);
  const handleClearLoop = useSequencerStore(s => s.handleClearLoop);

  const containerRef = useRef<HTMLDivElement>(null), pillRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [activeOffset, setActiveOffset] = useState(0), [manualWheelOffset, setManualWheelOffset] = useState(0), [isReady, setIsReady] = useState(false);

  // 1. Zéro chevauchement : filtre glouton par portée décroissante
  const macroSections = useMemo(() => {
    if (!songSections || songSections.length === 0) return [];
    const sorted = [...songSections].sort((a, b) => {
      const spanDiff = (b.endMeasure - b.startMeasure) - (a.endMeasure - a.startMeasure);
      if (spanDiff !== 0) return spanDiff;
      const levelDiff = (a.level ?? 0) - (b.level ?? 0);
      return levelDiff !== 0 ? levelDiff : a.startMeasure - b.startMeasure;
    });

    const kept: SongSection[] = [];
    for (const sec of sorted) {
      if (!kept.some(k => sec.startMeasure <= k.endMeasure && sec.endMeasure >= k.startMeasure)) {
        kept.push(sec);
      }
    }
    return kept.sort((a, b) => a.startMeasure - b.startMeasure);
  }, [songSections]);

  const activeIdx = useMemo(() => {
    const idx = macroSections.findIndex(s => currentMeasure >= s.startMeasure && currentMeasure <= s.endMeasure);
    return idx >= 0 ? idx : 0;
  }, [macroSections, currentMeasure]);

  // Centrage strict de la section active sur 50% (au-dessus du 1 de la Roda)
  useLayoutEffect(() => {
    const update = () => {
      const pill = pillRefs.current[activeIdx];
      if (pill) { setActiveOffset(-(pill.offsetLeft + pill.offsetWidth / 2)); setIsReady(true); }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [activeIdx, macroSections]);

  useEffect(() => { setManualWheelOffset(0); }, [activeIdx, isPlaying]);

  useEffect(() => {
    const el = containerRef.current, prevent = (e: WheelEvent) => e.preventDefault();
    el?.addEventListener('wheel', prevent, { passive: false });
    return () => el?.removeEventListener('wheel', prevent);
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (macroSections.length <= 1) return;
    const p0 = pillRefs.current[0], pLast = pillRefs.current[macroSections.length - 1];
    if (!p0 || !pLast) return;
    const c0 = p0.offsetLeft + p0.offsetWidth / 2, cLast = pLast.offsetLeft + pLast.offsetWidth / 2;
    const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
    setManualWheelOffset(prev => Math.max(-cLast, Math.min(-c0, activeOffset + prev - delta)) - activeOffset);
  };

  const handleSectionClick = (s: SongSection, e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey && loopStartMeasure !== null) {
      handleSetLoopStart(Math.min(loopStartMeasure, s.startMeasure));
      handleSetLoopEnd(Math.max(loopEndMeasure ?? loopStartMeasure, s.endMeasure));
      return;
    }
    if (isLoopRegionActive && loopStartMeasure === s.startMeasure && loopEndMeasure === s.endMeasure) handleClearLoop();
    else { handleSetLoopStart(s.startMeasure); handleSetLoopEnd(s.endMeasure); }
  };

  if (macroSections.length === 0) return null;
  const targetX = activeOffset + manualWheelOffset;

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className="relative w-[360px] sm:w-[440px] h-9 overflow-hidden select-none flex items-center"
      style={{
        maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
      }}
    >
      <div
        className={`absolute left-1/2 top-1/2 flex items-center gap-2 will-change-transform ${isReady ? 'transition-transform duration-300 ease-out' : ''}`}
        style={{ transform: `translate3d(${targetX}px, -50%, 0)` }}
      >
        {macroSections.map((s, idx) => {
          const isCurrent = currentMeasure >= s.startMeasure && currentMeasure <= s.endMeasure;
          const isLooped = isLoopRegionActive && loopStartMeasure !== null && loopEndMeasure !== null &&
            s.startMeasure >= loopStartMeasure && s.endMeasure <= loopEndMeasure;
          const themeStyle = isLooped ? 'bg-[#8b2a1a] text-[#f4ecd8] ring-1 ring-[#f4ecd8] shadow-[2px_2px_0px_#000]'
            : isCurrent ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)] shadow-[1.5px_1.5px_0px_#000]'
            : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[#eaddcf] opacity-80 hover:opacity-100';

          return (
            <button
              key={s.id}
              ref={el => { pillRefs.current[idx] = el; }}
              onClick={e => handleSectionClick(s, e)}
              title={`Section "${s.name}" (${s.startMeasure + 1}-${s.endMeasure + 1}) — Clic pour boucler, Maj+Clic pour étendre`}
              className={`flex items-center gap-1 px-2.5 py-1 cordel-border-sm text-[10px] font-cactus font-bold shrink-0 transition-all cursor-pointer ${themeStyle}`}
              style={s.color && !isLooped && !isCurrent ? { borderBottomColor: s.color, borderBottomWidth: '2.5px' } : undefined}
            >
              {isLooped && <Repeat size={10} className="shrink-0 animate-pulse" />}
              <span className="truncate max-w-[90px]">{s.name}</span>
              <span className="text-[8px] opacity-60 font-sans">{s.startMeasure + 1}-{s.endMeasure + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
