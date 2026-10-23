
import React from 'react';

interface CircleNavigationHeaderProps {
  lang?: string;
  totalMeasures: number;
  currentMeasure: number;
  displayMeasure: number;
  displayTotal: number;
  expandedRef: React.MutableRefObject<any[]>;
  pendingTargetMeasure: number | null;
  setPendingTargetMeasure: (m: number | null) => void;
  pendingTargetMeasureRef: React.MutableRefObject<number | null>;
  pendingTargetExpandedIndex: number | null;
  setPendingTargetExpandedIndex: (idx: number | null) => void;
  pendingTargetExpandedIndexRef: React.MutableRefObject<number | null>;
  measureDisplayRef: React.RefObject<HTMLSpanElement | null>;
  onNavigateMeasure: (mIdx: number) => void;
}

export const CircleNavigationHeader: React.FC<CircleNavigationHeaderProps> = ({
  lang,
  totalMeasures,
  currentMeasure,
  displayMeasure,
  displayTotal,
  expandedRef,
  pendingTargetMeasure,
  setPendingTargetMeasure,
  pendingTargetMeasureRef,
  pendingTargetExpandedIndex,
  setPendingTargetExpandedIndex,
  pendingTargetExpandedIndexRef,
  measureDisplayRef,
  onNavigateMeasure,
}) => {
  const handlePrev = () => {
    const expanded = expandedRef.current;
    if (expanded.length === 0) {
      const activeNav = pendingTargetMeasure !== null ? pendingTargetMeasure : currentMeasure;
      const prev = (activeNav - 1 + totalMeasures) % totalMeasures;
      setPendingTargetMeasure(prev);
      pendingTargetMeasureRef.current = prev;
      if (measureDisplayRef.current) measureDisplayRef.current.innerText = `${prev + 1} / ${totalMeasures}`;
      onNavigateMeasure(prev);
    } else {
      const currentIdx = pendingTargetExpandedIndex !== null
        ? pendingTargetExpandedIndex
        : expanded.findIndex(item => item.baseMeasure === currentMeasure);
      const prevIdx = (currentIdx - 1 + expanded.length) % expanded.length;
      const prevBase = expanded[prevIdx].baseMeasure;
      setPendingTargetMeasure(prevBase);
      pendingTargetMeasureRef.current = prevBase;
      setPendingTargetExpandedIndex(prevIdx);
      pendingTargetExpandedIndexRef.current = prevIdx;
      if (measureDisplayRef.current) measureDisplayRef.current.innerText = `${prevIdx + 1} / ${expanded.length}`;
      onNavigateMeasure(prevBase);
    }
  };

  const handleNext = () => {
    const expanded = expandedRef.current;
    if (expanded.length === 0) {
      const activeNav = pendingTargetMeasure !== null ? pendingTargetMeasure : currentMeasure;
      const next = (activeNav + 1) % totalMeasures;
      setPendingTargetMeasure(next);
      pendingTargetMeasureRef.current = next;
      if (measureDisplayRef.current) measureDisplayRef.current.innerText = `${next + 1} / ${totalMeasures}`;
      onNavigateMeasure(next);
    } else {
      const currentIdx = pendingTargetExpandedIndex !== null
        ? pendingTargetExpandedIndex
        : expanded.findIndex(item => item.baseMeasure === currentMeasure);
      const nextIdx = (currentIdx + 1) % expanded.length;
      const nextBase = expanded[nextIdx].baseMeasure;
      setPendingTargetMeasure(nextBase);
      pendingTargetMeasureRef.current = nextBase;
      setPendingTargetExpandedIndex(nextIdx);
      pendingTargetExpandedIndexRef.current = nextIdx;
      if (measureDisplayRef.current) measureDisplayRef.current.innerText = `${nextIdx + 1} / ${expanded.length}`;
      onNavigateMeasure(nextBase);
    }
  };

  return (
    <div className="absolute top-2 left-2 md:top-4 md:left-4 z-20 flex items-center">
      <div className="bg-[var(--cordel-bg)]/95 text-[var(--cordel-text)] cordel-border-sm p-1.5 px-2 md:p-2 md:px-3 shadow-[3px_3px_0px_var(--cordel-border)] md:shadow-[4px_4px_0px_var(--cordel-border)] flex items-center gap-1.5 md:gap-2">
        <button
          onClick={handlePrev}
          className="p-1 hover:bg-[#e8dec5] rounded cursor-pointer transition-colors active:translate-y-0.5"
          title={lang === 'pt' ? 'Compasso anterior' : 'Mesure précédente'}
          aria-label={lang === 'pt' ? 'Compasso anterior' : 'Mesure précédente'}
        >
          <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex flex-col items-center min-w-[70px] md:min-w-[90px]">
          <span className="text-[8px] md:text-[9px] uppercase opacity-65 tracking-wider font-bold">
            {lang === 'pt' ? 'Compasso' : 'Mesure'}
          </span>
          <span ref={measureDisplayRef} className="text-sm md:text-lg font-cactus font-bold leading-tight">
            {displayMeasure} / {displayTotal}
          </span>
        </div>

        <button
          onClick={handleNext}
          className="p-1 hover:bg-[#e8dec5] rounded cursor-pointer transition-colors active:translate-y-0.5"
          title={lang === 'pt' ? 'Próximo compasso' : 'Mesure suivante'}
          aria-label={lang === 'pt' ? 'Próximo compasso' : 'Mesure suivante'}
        >
          <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};
