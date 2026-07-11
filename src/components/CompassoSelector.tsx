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
    audio.handleTimelineNavigate(targetBaseMeasure, 0, 16);
  };

  const handleNavigateNext = () => {
    if (displayTotal <= 0) return;
    const nextIdx = (currentExpandedMeasureIdx + 1) % displayTotal;
    useSequencerStore.getState().setCurrentExpandedMeasureIdx(nextIdx);
    const targetBaseMeasure = expanded.length > 0 ? expanded[nextIdx].baseMeasure : nextIdx;
    audio.handleTimelineNavigate(targetBaseMeasure, 0, 16);
  };

  return (
    <div
      className={`flex flex-col items-center bg-[#f4ecd8] text-[#1a1a1a] cordel-border-sm p-1 shadow-[2px_2px_0px_rgba(0,0,0,1)] select-none rounded-sm ${className}`}
      style={style}
    >
      <span className="text-[8px] uppercase opacity-75 tracking-wider font-bold leading-none">
        {lang === 'pt' ? 'Compasso' : 'Mesure'}
      </span>
      <div className="flex items-center justify-between w-full mt-1 gap-1 px-1">
        <button
          onClick={(e) => { e.stopPropagation(); handleNavigatePrev(); }}
          className="w-5 h-5 flex items-center justify-center bg-[#f4ecd8] text-[#1a1a1a] border border-black font-bold text-[10px] cursor-pointer hover:bg-black hover:text-[#f4ecd8] transition-colors rounded-sm active:scale-95"
          title={lang === 'pt' ? 'Compasso anterior' : 'Mesure précédente'}
          style={{ padding: 0 }}
        >
          &lt;
        </button>
        <span className="text-xs font-cactus font-bold leading-none flex-grow text-center min-w-[45px]">
          {displayMeasure} / {displayTotal}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); handleNavigateNext(); }}
          className="w-5 h-5 flex items-center justify-center bg-[#f4ecd8] text-[#1a1a1a] border border-black font-bold text-[10px] cursor-pointer hover:bg-black hover:text-[#f4ecd8] transition-colors rounded-sm active:scale-95"
          title={lang === 'pt' ? 'Próximo compasso' : 'Mesure suivante'}
          style={{ padding: 0 }}
        >
          &gt;
        </button>
      </div>
    </div>
  );
};
