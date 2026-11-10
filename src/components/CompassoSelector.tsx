import React, { useMemo, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudio } from '../contexts/AudioContext';
import { getExpandedMeasures } from '../utils/measureHelpers';
import { subscribeToTick, unsubscribeFromTick, getLastAudibleTick } from '../audio/visualTickBuffer';

interface CompassoSelectorProps {
  className?: string;
  style?: React.CSSProperties;
  isActive?: boolean;
}

export const CompassoSelector: React.FC<CompassoSelectorProps> = ({ className = '', style, isActive = true }) => {
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
  const labelSpanRef = useRef<HTMLSpanElement>(null);
  const liveExpandedIdxRef = useRef<number>(currentExpandedMeasureIdx);

  useEffect(() => {
    if (isPlaying || queuedExpandedMeasureIdx !== null) return;
    const currentBase = expanded[currentExpandedMeasureIdx]?.baseMeasure;
    if (currentBase !== currentMeasure) {
      const firstMatch = expanded.findIndex((item) => item.baseMeasure === currentMeasure);
      if (firstMatch !== -1) {
        liveExpandedIdxRef.current = firstMatch;
        useSequencerStore.getState().setCurrentExpandedMeasureIdx(firstMatch);
      }
    } else {
      liveExpandedIdxRef.current = currentExpandedMeasureIdx;
    }
  }, [currentMeasure, expanded, currentExpandedMeasureIdx, queuedExpandedMeasureIdx, isPlaying]);

  useEffect(() => {
    if (!isActive || !isPlaying) return;
    const resolveExpIdx = (m: number, iter: number) => {
      if (expanded.length === 0) return m;
      const exact = expanded.findIndex((item) => item.baseMeasure === m && item.iteration === iter);
      if (exact !== -1) return exact;
      const first = expanded.findIndex((item) => item.baseMeasure === m);
      return first !== -1 ? first : m;
    };
    const updateDom = (m: number, iter: number) => {
      const idx = resolveExpIdx(m, iter);
      liveExpandedIdxRef.current = idx;
      const qIdx = useSequencerStore.getState().queuedExpandedMeasureIdx;
      const shownIdx = qIdx !== null ? qIdx : idx;
      if (labelSpanRef.current) {
        const nextText = `${shownIdx + 1} / ${displayTotal}`;
        if (labelSpanRef.current.textContent !== nextText) labelSpanRef.current.textContent = nextText;
      }
    };
    const last = getLastAudibleTick();
    if (last && last.step >= 0 && !last.isPreRoll) updateDom(last.measure, last.iteration || 1);
    const handleTick = (evt: any) => {
      if (!evt || evt.step < 0 || evt.isPreRoll) return;
      updateDom(evt.measure ?? 0, evt.iteration || 1);
    };
    subscribeToTick(handleTick);
    return () => unsubscribeFromTick(handleTick);
  }, [isActive, isPlaying, expanded, displayTotal, queuedExpandedMeasureIdx]);

  const effectiveExpandedIdx =
    isPlaying && queuedExpandedMeasureIdx !== null
      ? queuedExpandedMeasureIdx
      : (isPlaying ? liveExpandedIdxRef.current : currentExpandedMeasureIdx);
  const displayMeasure = effectiveExpandedIdx + 1;
  const isArmed = Boolean(isPlaying && queuedExpandedMeasureIdx !== null);

  const navigateStep = (delta: -1 | 1) => {
    if (displayTotal <= 0) return;
    const store = useSequencerStore.getState();
    const baseIdx =
      store.isPlaying && store.queuedExpandedMeasureIdx !== null
        ? store.queuedExpandedMeasureIdx
        : (store.isPlaying ? liveExpandedIdxRef.current : store.currentExpandedMeasureIdx);
    const nextIdx = (baseIdx + delta + displayTotal) % displayTotal;
    const targetBaseMeasure = expanded.length > 0 ? expanded[nextIdx].baseMeasure : nextIdx;
    const targetIteration = expanded.length > 0 ? expanded[nextIdx].iteration : 1;

    if (store.isPlaying) {
      store.armQueuedMeasure(targetBaseMeasure, nextIdx);
    } else {
      liveExpandedIdxRef.current = nextIdx;
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
          ref={labelSpanRef}
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
