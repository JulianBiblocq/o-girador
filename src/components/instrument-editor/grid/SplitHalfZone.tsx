
import React from 'react';
import { GLUE_CURSOR } from './gridConstants';

interface SplitHalfZoneProps {
  trackId: number;
  patternId: number;
  i: number;
  subIndex: 0 | 1;
  textVal: string;
  textColor?: string;
  activeTool?: string | number;
  onMouseDown: (e: React.MouseEvent<any>, index: number, value: any, subIndex: 0 | 1) => void;
  onMouseEnter: (index: number, e?: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent<any>, index: number, value: any, subIndex: 0 | 1) => void;
  onTouchMove?: (e: React.TouchEvent<any>) => void;
  onTouchEnd?: (e: React.TouchEvent<any>, index: number, value: any, subIndex: 0 | 1) => void;
  onContextMenu?: (e: React.MouseEvent<any>, index: number, value: any, subIndex?: 0 | 1) => void;
  onKeyDown: (e: React.KeyboardEvent<any>, index: number, value: any, subIndex: 0 | 1) => void;
  onSelectForSculpt?: (index: number, subIndex?: 0 | 1) => void;
}

export const SplitHalfZone: React.FC<SplitHalfZoneProps> = ({
  trackId,
  patternId,
  i,
  subIndex,
  textVal,
  textColor,
  activeTool,
  onMouseDown,
  onMouseEnter,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onContextMenu,
  onKeyDown,
  onSelectForSculpt
}) => {
  const isTopLeft = subIndex === 0;

  return (
    <div
      className="absolute inset-0 z-10 select-none outline-none"
      style={{
        clipPath: isTopLeft ? 'polygon(0 0, 100% 0, 0 100%)' : 'polygon(100% 0, 100% 100%, 0 100%)',
        cursor: activeTool === 'scissors' ? GLUE_CURSOR : 'pointer'
      }}
      data-track-id={trackId}
      data-pattern-id={patternId}
      data-step-index={i}
      data-sub-index={subIndex.toString()}
      tabIndex={-1}
      onMouseDown={(e) => onMouseDown(e, i, textVal, subIndex)}
      onClick={() => onSelectForSculpt?.(i, subIndex)}
      onMouseEnter={(e) => onMouseEnter(i, e)}
      onTouchStart={(e) => onTouchStart(e, i, textVal, subIndex)}
      onTouchMove={onTouchMove}
      onTouchEnd={(e) => onTouchEnd?.(e, i, textVal, subIndex)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(e, i, textVal, subIndex);
      }}
      onKeyDown={(e) => onKeyDown(e, i, textVal, subIndex)}
    >
      <span
        className={`absolute font-bold select-none pointer-events-none text-[10px] sm:text-xs ${
          isTopLeft ? 'top-0.5 left-1' : 'bottom-0.5 right-1'
        }`}
        style={{ color: textColor || '#f4ecd8' }}
      >
        {textVal === '0' || !textVal ? '' : textVal}
      </span>
    </div>
  );
};
