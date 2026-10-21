/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { SongSection } from '../../types';

interface Props {
  isPlaying: boolean;
  onNavigateMeasure?: (m: number) => void;
}

export const MobileSectionLooper: React.FC<Props> = ({ isPlaying, onNavigateMeasure }) => {
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null);

  const {
    songSections, loopStartMeasure, loopEndMeasure, isLoopRegionActive, pendingLoopRange, lang,
    setLoopStartMeasure, setLoopEndMeasure, setIsLoopRegionActive, setPendingLoopRange,
  } = useSequencerStore(
    useShallow((s) => ({
      songSections: s.songSections || [],
      loopStartMeasure: s.loopStartMeasure, loopEndMeasure: s.loopEndMeasure,
      isLoopRegionActive: s.isLoopRegionActive, pendingLoopRange: s.pendingLoopRange,
      lang: s.lang || 'pt',
      setLoopStartMeasure: s.setLoopStartMeasure, setLoopEndMeasure: s.setLoopEndMeasure,
      setIsLoopRegionActive: s.setIsLoopRegionActive, setPendingLoopRange: s.setPendingLoopRange,
    }))
  );

  const handleClearLoop = () => {
    setIsLoopRegionActive(false); setPendingLoopRange(null); setSelectionAnchor(null);
  };

  const handleSelectSection = (sec: SongSection) => {
    const isSingleActive = isLoopRegionActive && loopStartMeasure === sec.startMeasure && loopEndMeasure === sec.endMeasure && !pendingLoopRange;
    if ((isSingleActive && !selectionAnchor) || selectionAnchor === sec.id) {
      handleClearLoop();
      return;
    }

    if (!selectionAnchor) {
      const isExt = isPlaying && isLoopRegionActive && loopStartMeasure === sec.startMeasure && loopEndMeasure !== null && sec.endMeasure > loopEndMeasure;
      if (!isPlaying) {
        setLoopStartMeasure(sec.startMeasure); setLoopEndMeasure(sec.endMeasure);
        setIsLoopRegionActive(true); setPendingLoopRange(null); setSelectionAnchor(sec.id);
        onNavigateMeasure?.(sec.startMeasure);
      } else if (isExt) {
        setLoopEndMeasure(sec.endMeasure); setIsLoopRegionActive(true); setPendingLoopRange(null); setSelectionAnchor(null);
      } else {
        setPendingLoopRange({ startMeasure: sec.startMeasure, endMeasure: sec.endMeasure });
        setSelectionAnchor(sec.id);
      }
      return;
    }

    const anchorSec = songSections.find((s) => s.id === selectionAnchor);
    const startM = anchorSec ? Math.min(anchorSec.startMeasure, sec.startMeasure) : sec.startMeasure;
    const endM = anchorSec ? Math.max(anchorSec.endMeasure, sec.endMeasure) : sec.endMeasure;
    const isExt = isPlaying && isLoopRegionActive && loopStartMeasure === startM && loopEndMeasure !== null && endM > loopEndMeasure;

    if (!isPlaying) {
      setLoopStartMeasure(startM); setLoopEndMeasure(endM); setIsLoopRegionActive(true);
      setPendingLoopRange(null); setSelectionAnchor(null); onNavigateMeasure?.(startM);
    } else if (isExt) {
      setLoopEndMeasure(endM); setIsLoopRegionActive(true); setPendingLoopRange(null); setSelectionAnchor(null);
    } else {
      setPendingLoopRange({ startMeasure: startM, endMeasure: endM }); setSelectionAnchor(null);
    }
  };

  const isAllActive = !isLoopRegionActive && pendingLoopRange === null;

  return (
    <div className="w-full bg-[var(--cordel-surface)] px-2 py-1 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0 select-none border-b-2 border-[var(--cordel-border)]">
      <button
        onClick={handleClearLoop}
        className={`min-h-[40px] px-3 py-1.5 text-xs font-cactus font-bold uppercase border-2 shrink-0 flex items-center justify-center transition-colors shadow-[2px_2px_0px_#000] cursor-pointer ${
          isAllActive ? 'bg-[#b94a2c] text-[#f4ecd8] border-black' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)] hover:border-[#b94a2c]'
        }`}
      >
        {lang === 'pt' ? 'TUDO' : 'TOUT'}
      </button>

      {songSections.map((sec) => {
        const isPending = pendingLoopRange && sec.startMeasure >= pendingLoopRange.startMeasure && sec.endMeasure <= pendingLoopRange.endMeasure;
        const isActive = !isPending && isLoopRegionActive && loopStartMeasure !== null && loopEndMeasure !== null && sec.startMeasure >= loopStartMeasure && sec.endMeasure <= loopEndMeasure;
        const isAnchor = selectionAnchor === sec.id;

        return (
          <button
            key={sec.id}
            onClick={() => handleSelectSection(sec)}
            className={`min-h-[40px] px-3 py-1.5 text-xs font-cactus font-bold uppercase border-2 shrink-0 flex items-center justify-center transition-all shadow-[2px_2px_0px_#000] cursor-pointer ${
              isPending
                ? 'bg-[#b94a2c]/70 text-[#f4ecd8] border-black animate-pulse'
                : isActive
                ? 'bg-[#b94a2c] text-[#f4ecd8] border-black'
                : isAnchor
                ? 'bg-[var(--cordel-card-btn-bg)] text-[#b94a2c] border-[#b94a2c]'
                : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)] hover:border-[#b94a2c]'
            }`}
          >
            {sec.name}
          </button>
        );
      })}
    </div>
  );
};
