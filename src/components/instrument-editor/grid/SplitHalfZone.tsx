import React from 'react';
import { GLUE_CURSOR } from './gridConstants';

interface SplitHalfZoneProps {
  trackId: number;
  patternId: number;
  i: number;
  subIndex: 0 | 1;
  fullVal: [string, string];
  textVal: string;
  textColor?: string;
  activeTool?: string | number;
  isMultiSelectActive?: boolean;
  onMouseDown: (e: React.MouseEvent<any>, index: number, value: [string, string], subIndex: 0 | 1) => void;
  onMouseEnter: (index: number, e?: React.MouseEvent, subIndex?: 0 | 1) => void;
  onTouchStart: (e: React.TouchEvent<any>, index: number, value: [string, string], subIndex: 0 | 1) => void;
  onTouchMove?: (e: React.TouchEvent<any>) => void;
  onTouchEnd?: (e: React.TouchEvent<any>, index: number, value: [string, string], subIndex: 0 | 1) => void;
  onContextMenu?: (e: React.MouseEvent<any>, index: number, value: [string, string], subIndex?: 0 | 1) => void;
  onKeyDown: (e: React.KeyboardEvent<any>, index: number, value: [string, string], subIndex: 0 | 1) => void;
  onSelectForSculpt?: (index: number, subIndex?: 0 | 1) => void;
}

export const SplitHalfZone: React.FC<SplitHalfZoneProps> = ({
  trackId, patternId, i, subIndex, fullVal, textVal, textColor,
  activeTool, isMultiSelectActive, onMouseDown, onMouseEnter,
  onTouchStart, onTouchMove, onTouchEnd, onContextMenu, onKeyDown, onSelectForSculpt,
}) => {
  const isTopLeft = subIndex === 0;

  return (
    <div
      className="absolute inset-0 z-10 select-none outline-none"
      style={{
        clipPath: isTopLeft ? 'polygon(0 0, 100% 0, 0 100%)' : 'polygon(100% 0, 100% 100%, 0 100%)',
        cursor: activeTool === 'scissors' ? GLUE_CURSOR : 'pointer',
        touchAction: isMultiSelectActive ? 'none' : undefined,
      }}
      data-track-id={trackId}
      data-pattern-id={patternId}
      data-step-index={i}
      data-sub-index={subIndex.toString()}
      tabIndex={-1}
      onMouseDown={(e) => onMouseDown(e, i, fullVal, subIndex)}
      onClick={(e) => {
        if (e.shiftKey || e.ctrlKey || e.metaKey || isMultiSelectActive) return;
        onSelectForSculpt?.(i, subIndex);
      }}
      onMouseEnter={(e) => onMouseEnter(i, e, subIndex)}
      onTouchStart={(e) => onTouchStart(e, i, fullVal, subIndex)}
      onTouchMove={onTouchMove}
      onTouchEnd={(e) => onTouchEnd?.(e, i, fullVal, subIndex)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(e, i, fullVal, subIndex);
      }}
      onKeyDown={(e) => onKeyDown(e, i, fullVal, subIndex)}
    >
      <span
        className={`absolute font-bold select-none pointer-events-none text-[10px] sm:text-xs ${
          isTopLeft ? 'top-0.5 left-1' : 'bottom-0.5 right-1'
        }`}
        style={{ color: textColor || 'var(--cordel-paper-surface)' }}
      >
        {textVal === '0' || !textVal ? '' : textVal}
      </span>
    </div>
  );
};
