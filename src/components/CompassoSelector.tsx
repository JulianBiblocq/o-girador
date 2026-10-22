import React, { useMemo, useEffect } from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudio } from '../contexts/AudioContext';
import { getExpandedMeasures } from '../utils/measureHelpers';

interface CompassoSelectorProps {
  className?: string;
  style?: React.CSSProperties;
}

export const CompassoSelector: React.FC<CompassoSelectorProps> = ({ className = '', style }) => {
  const lang = useSequencerStore(state => state.lang);
  const currentMeasure = useSequencerStore(state => state.currentMeasure);
  const totalMeasures = useSequencerStore(state => state.totalMeasures);
  const songSections = useSequencerStore(state => state.songSections);
  const currentExpandedMeasureIdx = useSequencerStore(state => state.currentExpandedMeasureIdx);

  const audio = useAudio();
  const expanded = useMemo(() => getExpandedMeasures(totalMeasures, songSections), [totalMeasures, songSections]);
  const displayTotal = expanded.length > 0 ? expanded.length : totalMeasures;

  // Synchronize external measure changes (e.g. from playback or timeline clicks) to the expanded index
  useEffect(() => {
    const currentBase = expanded[currentExpandedMeasureIdx]?.baseMeasure;
    if (currentBase !== currentMeasure) {
      const firstMatch = expanded.findIndex(item => item.baseMeasure === currentMeasure);
      if (firstMatch !== -1) {
        useSequencerStore.getState().setCurrentExpandedMeasureIdx(firstMatch);
      }
    }
  }, [currentMeasure, expanded, currentExpandedMeasureIdx]);

  const displayMeasure = currentExpandedMeasureIdx + 1;

  const handleNavigatePrev = () => {
    if (displayTotal <= 0) return;
    const prevIdx = (currentExpandedMeasureIdx - 1 + displayTotal) % displayTotal;
    useSequencerStore.getState().setCurrentExpandedMeasureIdx(prevIdx);
    const targetBaseMeasure = expanded.length > 0 ? expanded[prevIdx].baseMeasure : prevIdx;
    const targetIteration = expanded.length > 0 ? expanded[prevIdx].iteration : 1;
    audio.handleTimelineNavigate(targetBaseMeasure, 0, 16, targetIteration);
  };

  const handleNavigateNext = () => {
    if (displayTotal <= 0) return;
    const nextIdx = (currentExpandedMeasureIdx + 1) % displayTotal;
    useSequencerStore.getState().setCurrentExpandedMeasureIdx(nextIdx);
    const targetBaseMeasure = expanded.length > 0 ? expanded[nextIdx].baseMeasure : nextIdx;
    const targetIteration = expanded.length > 0 ? expanded[nextIdx].iteration : 1;
    audio.handleTimelineNavigate(targetBaseMeasure, 0, 16, targetIteration);
  };

  return (
    <div
      className={`h-[38px] min-h-[38px] max-h-[38px] rounded-none bg-[#f4ecd8] dark:bg-[#e2d7c0] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] box-border px-2 gap-2 flex items-center select-none shrink-0 ${className}`}
      style={style}
    >
      <button
        onClick={(e) => { e.stopPropagation(); handleNavigatePrev(); }}
        className="w-6 h-6 rounded-none border border-[#1a1a1a] bg-[#f4ecd8] dark:bg-[#e2d7c0] text-[#1a1a1a] font-bold text-xs flex items-center justify-center cursor-pointer hover:bg-[#1a1a1a] hover:text-[#f4ecd8] transition-colors shrink-0 active:scale-95"
        title={lang === 'pt' ? 'Compasso anterior' : 'Mesure précédente'}
      >
        ◀
      </button>
      <div className="flex flex-col items-center justify-center min-w-[55px]">
        <span className="text-[8px] uppercase opacity-75 tracking-wider font-bold leading-none">
          {lang === 'pt' ? 'Compasso' : 'Mesure'}
        </span>
        <span className="text-xs font-cactus font-bold leading-tight mt-0.5">
          {displayMeasure} / {displayTotal}
        </span>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); handleNavigateNext(); }}
        className="w-6 h-6 rounded-none border border-[#1a1a1a] bg-[#f4ecd8] dark:bg-[#e2d7c0] text-[#1a1a1a] font-bold text-xs flex items-center justify-center cursor-pointer hover:bg-[#1a1a1a] hover:text-[#f4ecd8] transition-colors shrink-0 active:scale-95"
        title={lang === 'pt' ? 'Próximo compasso' : 'Mesure suivante'}
      >
        ▶
      </button>
    </div>
  );
};
