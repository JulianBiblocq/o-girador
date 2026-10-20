import React from 'react';

interface TimelineContextMenuHeaderProps {
  trackTitle: string;
  hasMultiSelect: boolean;
  selectedCellsCount: number;
  measureIdx: number;
  lang: string;
}

export const TimelineContextMenuHeader: React.FC<TimelineContextMenuHeaderProps> = ({
  trackTitle,
  hasMultiSelect,
  selectedCellsCount,
  measureIdx,
  lang,
}) => {
  const displayTitle = hasMultiSelect ? (lang === 'fr' ? 'Multi-Sélection' : 'Multi-Seleção') : trackTitle;
  const badgeLabel = hasMultiSelect
    ? `${selectedCellsCount} ${lang === 'fr' ? 'mes.' : 'comp.'}`
    : `M${measureIdx + 1}`;

  return (
    <div className="px-2 py-1 mb-1.5 border-b-2 border-[#1a1a1a] font-bold text-[11px] tracking-wider uppercase flex items-center justify-between text-[#1a1a1a]">
      <span className="truncate max-w-[120px]" title={displayTitle}>
        {displayTitle}
      </span>
      <span className="bg-[#1a1a1a] text-[#f4ecd8] px-1.5 py-0.5 rounded-none text-[10px] font-sans font-black">
        {badgeLabel}
      </span>
    </div>
  );
};
