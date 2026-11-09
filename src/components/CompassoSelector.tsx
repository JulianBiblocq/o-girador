import React, { useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudio } from '../contexts/AudioContext';
import { getExpandedMeasures } from '../utils/measureHelpers';

interface CompassoSelectorProps {
  className?: string;
  style?: React.CSSProperties;
}

export const CompassoSelector: React.FC<CompassoSelectorProps> = ({ className = '', style }) => {
  const lang = useSequencerStore((state) => state.lang);
  const currentMeasure = useSequencerStore((state) => state.currentMeasure);
  const totalMeasures = useSequencerStore((state) => state.totalMeasures);
  const songSections = useSequencerStore((state) => state.songSections);
  const currentExpandedMeasureIdx = useSequencerStore((state) => state.currentExpandedMeasureIdx);
  const queuedExpandedMeasureIdx = useSequencerStore((state) => state.queuedExpandedMeasureIdx);
  const isPlaying = useSequencerStore((state) => state.isPlaying);

  const audio = useAudio();
  const expanded = useMemo(() => getExpandedMeasures(totalMeasures, songSections), [totalMeasures, songSections]);
  const displayTotal = expanded.length > 0 ? expanded.length : totalMeasures;

  useEffect(() => {
    const currentBase = expanded[currentExpandedMeasureIdx]?.baseMeasure;
    if (currentBase !== currentMeasure) {
      const firstMatch = expanded.findIndex((item) => item.baseMeasure === currentMeasure);
      if (firstMatch !== -1) {
        useSequencerStore.getState().setCurrentExpandedMeasureIdx(firstMatch);
      }
    }
  }, [currentMeasure, expanded, currentExpandedMeasureIdx]);

  const effectiveExpandedIdx =
    isPlaying && queuedExpandedMeasureIdx !== null ? queuedExpandedMeasureIdx : currentExpandedMeasureIdx;
  const displayMeasure = effectiveExpandedIdx + 1;
  const isArmed = isPlaying && queuedExpandedMeasureIdx !== null && queuedExpandedMeasureIdx !== currentExpandedMeasureIdx;

  const navigateStep = (delta: -1 | 1) => {
    if (displayTotal <= 0) return;
    const store = useSequencerStore.getState();
    const baseIdx =
      store.isPlaying && store.queuedExpandedMeasureIdx !== null
        ? store.queuedExpandedMeasureIdx
        : store.currentExpandedMeasureIdx;
    const nextIdx = (baseIdx + delta + displayTotal) % displayTotal;
    const targetBaseMeasure = expanded.length > 0 ? expanded[nextIdx].baseMeasure : nextIdx;
    const targetIteration = expanded.length > 0 ? expanded[nextIdx].iteration : 1;

    if (store.isPlaying) {
      store.armQueuedMeasure(targetBaseMeasure, nextIdx);
    } else {
      store.clearQueuedMeasure();
      store.setCurrentExpandedMeasureIdx(nextIdx);
    }
    audio.handleTimelineNavigate(targetBaseMeasure, 0, 16, targetIteration);
  };

  return (
    <div
      className={`h-[38px] min-h-[38px] max-h-[38px] rounded-none bg-[#f4ecd8] dark:bg-[#e2d7c0] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] box-border px-2 gap-2 flex items-center select-none shrink-0 ${className}`}
      style={style}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigateStep(-1);
        }}
        className="w-6 h-6 rounded-none border border-[#1a1a1a] bg-[#f4ecd8] dark:bg-[#e2d7c0] text-[#1a1a1a] font-bold text-xs flex items-center justify-center cursor-pointer hover:bg-[#1a1a1a] hover:text-[#f4ecd8] transition-colors shrink-0 active:scale-95"
        title={lang === 'pt' ? 'Compasso anterior' : 'Mesure précédente'}
      >
        <ChevronLeft size={14} />
      </button>
      <div className="flex flex-col items-center justify-center min-w-[55px]">
        <span className="text-[8px] uppercase opacity-75 tracking-wider font-bold leading-none">
          {lang === 'pt' ? 'Compasso' : 'Mesure'}
        </span>
        <span
          className={`text-xs font-cactus font-bold leading-tight mt-0.5 transition-colors ${
            isArmed ? 'text-[#c25e38]' : ''
          }`}
        >
          {displayMeasure} / {displayTotal}
        </span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigateStep(1);
        }}
        className="w-6 h-6 rounded-none border border-[#1a1a1a] bg-[#f4ecd8] dark:bg-[#e2d7c0] text-[#1a1a1a] font-bold text-xs flex items-center justify-center cursor-pointer hover:bg-[#1a1a1a] hover:text-[#f4ecd8] transition-colors shrink-0 active:scale-95"
        title={lang === 'pt' ? 'Próximo compasso' : 'Mesure suivante'}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
};
