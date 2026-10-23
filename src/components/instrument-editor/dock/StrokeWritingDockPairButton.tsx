
import React from 'react';
import { isDarkText } from '../../../data';

interface StrokeWritingDockPairButtonProps {
  pair: any;
  instrument: any;
  activeTool: string;
  isScissorsActive: boolean;
  isEraserActive: boolean;
  isFr: boolean;
  onSelectTool: (tool: string) => void;
}

export const StrokeWritingDockPairButton: React.FC<StrokeWritingDockPairButtonProps> = React.memo(({
  pair, instrument, activeTool, isScissorsActive, isEraserActive, isFr, onSelectTool,
}) => {
  const isWeakActive = pair.weak && pair.weak.symbol === activeTool;
  const isStrongActive = pair.strong.symbol === activeTool || pair.id === activeTool;
  const isSelected = !isScissorsActive && !isEraserActive && (
    isStrongActive || isWeakActive || pair.strokes.some((s: any) => s.symbol === activeTool)
  );

  const displayedStroke = isSelected && isWeakActive && pair.weak ? pair.weak : pair.strong;
  const bgCol = instrument.colors?.[displayedStroke.colorKey] || instrument.colors?.[pair.strong.colorKey] || '#666';
  const isDark = isDarkText(instrument.id, displayedStroke.symbol);
  const txtCol = isDark ? '#1a1a1a' : '#f4ecd8';
  const strokeChain = pair.strokes.map((s: any) => s.symbol).join(' / ');

  const handleClick = () => {
    if (isSelected && isStrongActive && pair.weak) onSelectTool(pair.weak.symbol);
    else onSelectTool(pair.strong.symbol);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.deltaY < 0) onSelectTool(pair.strong.symbol);
    else if (e.deltaY > 0) onSelectTool(pair.weak ? pair.weak.symbol : pair.strong.symbol);
  };

  return (
    <button
      key={pair.id}
      type="button"
      onClick={handleClick}
      onWheel={handleWheel}
      className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border-[2px] transition-all cursor-pointer select-none shrink-0 active:scale-95 ${
        isSelected
          ? 'border-[#8b2a1a] bg-[#f4ecd8] shadow-[2px_2px_0px_#8b2a1a] scale-105 z-10'
          : 'border-[#1a1a1a] bg-[#fdfbf7] hover:bg-[#f4ecd8] shadow-[1px_1px_0px_#1a1a1a]'
      }`}
      title={`${pair.mainLabel} (${strokeChain}) — ${isFr ? 'Molette: Nuance | Raccourci' : 'Roda: Nuance | Tecla'}: ${pair.strong.shortcut}`}
    >
      <div
        className={`w-7 h-7 rounded-sm flex items-center justify-center font-bold text-xs shadow-inner transition-colors ${
          isSelected && isWeakActive ? 'opacity-85 ring-1 ring-inset ring-black/20' : ''
        }`}
        style={{ backgroundColor: bgCol, color: txtCol }}
      >
        {displayedStroke.symbol}
      </div>

      <div className="flex flex-col items-start leading-tight min-w-0">
        <span className={`text-[11px] font-cactus font-bold truncate max-w-[80px] sm:max-w-[105px] ${
          isSelected ? 'text-[#8b2a1a]' : 'text-[#1a1a1a]'
        }`}>
          {pair.mainLabel}
        </span>
        <span className="text-[9px] text-[#666] font-mono">
          {strokeChain} [{pair.strong.shortcut}]
        </span>
      </div>
    </button>
  );
});

StrokeWritingDockPairButton.displayName = 'StrokeWritingDockPairButton';
