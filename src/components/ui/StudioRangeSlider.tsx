import React from 'react';
import { useStudioRangeSliderDrag } from '../../hooks/useStudioRangeSliderDrag';

export interface StudioRangeSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  resetValue?: number;
  accentVar: string;
  surfaceTone?: 'parchment' | 'theme';
  ariaLabel?: string;
  resetTitle?: string;
  labelContent?: React.ReactNode;
  formatValue?: (val: number) => string;
  onVisualChange?: (val: number | null) => void;
  onScrub?: (val: number, isFirstChange: boolean) => void;
  onCommit?: (val: number, hadScrub: boolean) => void;
  onReset?: (resetVal: number) => void;
}

export const StudioRangeSlider: React.FC<StudioRangeSliderProps> = React.memo((props) => {
  const {
    value, min, max, step = 1, resetValue, accentVar, surfaceTone = 'parchment', ariaLabel, resetTitle,
    labelContent, formatValue, onVisualChange, onScrub, onCommit, onReset,
  } = props;

  const {
    railRef, displayVal, pct,
    handlePointerDown, handlePointerMove, finishDrag, triggerReset, handleKeyDown,
  } = useStudioRangeSliderDrag({
    value, min, max, step, resetValue, onVisualChange, onScrub, onCommit, onReset,
  });

  const isTheme = surfaceTone === 'theme';
  const textCls = isTheme ? 'text-[var(--cordel-text)]' : 'text-[var(--cordel-ink-dark)]';
  const trackBgCls = isTheme ? 'bg-[var(--cordel-text)]/18' : 'bg-[var(--cordel-ink-dark)]/15';
  const thumbRingCls = isTheme
    ? 'border-[var(--cordel-bg)] ring-[var(--cordel-border-strong)]'
    : 'border-[var(--cordel-parchment-bg)] ring-[var(--cordel-ink-dark)]/50';

  return (
    <div className="flex flex-col gap-1 w-full min-w-0 select-none">
      {labelContent !== undefined && (
        <div className={`flex justify-between items-center text-[10px] font-bold ${textCls} w-full min-w-0`}>
          {labelContent}
          <span
            onDoubleClick={resetValue !== undefined ? triggerReset : undefined}
            title={resetTitle}
            className={`font-mono ${textCls} tabular-nums shrink-0 ml-1 ${resetValue !== undefined ? 'cursor-pointer hover:underline' : ''}`}
          >
            {formatValue ? formatValue(displayVal) : `${displayVal}%`}
          </span>
        </div>
      )}
      <div
        ref={railRef} role="slider" tabIndex={0} aria-label={ariaLabel}
        aria-valuemin={min} aria-valuemax={max} aria-valuenow={displayVal} title={resetTitle}
        draggable={false} onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onMouseDown={(e) => e.stopPropagation()} onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove} onPointerUp={finishDrag}
        onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}
        onDoubleClick={resetValue !== undefined ? triggerReset : undefined} onKeyDown={handleKeyDown}
        className="relative w-full h-5 flex items-center cursor-ew-resize touch-none select-none outline-none"
      >
        <div className={`relative w-full h-2 rounded-full ${trackBgCls} overflow-hidden pointer-events-none`}>
          <div
            className="w-full h-full origin-left pointer-events-none"
            style={{ backgroundColor: accentVar, transform: `scaleX(${pct / 100})` }}
          />
        </div>
        <div
          className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-[1.5px] ring-1 ${thumbRingCls} pointer-events-none`}
          style={{ backgroundColor: accentVar, left: `${pct}%` }}
        />
      </div>
    </div>
  );
});

StudioRangeSlider.displayName = 'StudioRangeSlider';
