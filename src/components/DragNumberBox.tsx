import React from 'react';
import { formatDragNumberBoxValue, getDragNumberBoxFillStyles } from './controls/dragNumberBoxMath';
import { useDragNumberBoxInteraction } from './controls/useDragNumberBoxInteraction';

interface DragNumberBoxProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  onAudioDrag?: (val: number) => void;
  defaultValue?: number;
  className?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  mode?: 'unipolar' | 'bipolar';
  displayFormatter?: (val: number) => string;
  style?: React.CSSProperties;
  gaugeRef?: React.RefObject<HTMLDivElement | null>;
  valueTextRef?: React.RefObject<HTMLSpanElement | null>;
  fillColor?: string;
}

const DragNumberBoxComponent: React.FC<DragNumberBoxProps> = ({ 
  label, 
  value, 
  onChange, 
  onAudioDrag,
  defaultValue = 0,
  className = '', 
  disabled = false,
  min,
  max,
  step,
  mode = 'unipolar',
  displayFormatter,
  style,
  gaugeRef,
  valueTextRef,
  fillColor,
}) => {
  const actualMin = min !== undefined ? min : 0;
  const actualMax = max !== undefined ? max : 100;
  const range = actualMax - actualMin;

  const formatValue = (val: number) => formatDragNumberBoxValue(val, label, displayFormatter, min, max);

  const {
    containerRef,
    valueSpanRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    resetToDefault,
  } = useDragNumberBoxInteraction({
    value, disabled, actualMin, actualMax, range, step, mode, defaultValue,
    onChange, onAudioDrag, formatValue, gaugeRef,
  });

  const setGaugeRef = (el: HTMLDivElement | null) => {
    if (gaugeRef) {
      (gaugeRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    }
  };

  const setTextRef = (el: HTMLSpanElement | null) => {
    (valueSpanRef as React.MutableRefObject<HTMLSpanElement | null>).current = el;
    if (valueTextRef) {
      (valueTextRef as React.MutableRefObject<HTMLSpanElement | null>).current = el;
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    resetToDefault();
  };

  const initialStyles = getDragNumberBoxFillStyles(value, actualMin, range, mode);
  const zeroPos = range > 0 ? Math.max(0, Math.min(100, ((0 - actualMin) / range) * 100)) : 50;

  const styleObject = {
    '--fill-left': initialStyles.left,
    '--fill-width': initialStyles.width,
    '--zero-pos': `${zeroPos}%`,
    '--show-center-line': mode === 'bipolar' ? 'block' : 'none',
    ...(fillColor ? {
      '--fader-fill-color': fillColor,
      '--fader-fill-opacity': '0.30',
      '--fader-drag-opacity': '0.50',
    } : {}),
  } as React.CSSProperties;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      style={{ ...styleObject, ...style }}
      className={`digital-fader flex items-center justify-between px-1.5 py-0.5 text-[9px] font-bold select-none border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-[var(--cordel-text)] shadow-[1px_1px_0_var(--cordel-border)] transition-all ${
        disabled 
          ? 'opacity-35 cursor-not-allowed' 
          : 'cursor-row-resize active:translate-y-[0.5px] active:shadow-none'
      } ${className}`}
    >
      <div
        ref={setGaugeRef}
        className="absolute inset-y-0 left-0 pointer-events-none origin-left z-[1]"
        style={{
          width: '100%',
          backgroundColor: fillColor || 'currentColor',
          opacity: fillColor ? 0.30 : 0.20,
          transform: `scaleX(${Math.max(0, Math.min(1, (value - actualMin) / (range || 1)))})`,
        }}
      />
      <span className="uppercase opacity-60 tracking-wider font-sans relative z-[2]">{label}</span>
      <span ref={setTextRef} className="font-mono font-bold text-[10px] ml-1 w-[24px] text-right shrink-0 relative z-[2]">
        {disabled ? '—' : formatValue(value)}
      </span>
    </div>
  );
};

export const DragNumberBox = React.memo(DragNumberBoxComponent);
