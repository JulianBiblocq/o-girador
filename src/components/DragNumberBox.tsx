import React, { useRef, useEffect } from 'react';

interface DragNumberBoxProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  onAudioDrag?: (val: number) => void;
  className?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  displayFormatter?: (val: number) => string;
}

const DragNumberBoxComponent: React.FC<DragNumberBoxProps> = ({ 
  label, 
  value, 
  onChange, 
  onAudioDrag,
  className = '', 
  disabled = false,
  min,
  max,
  step,
  displayFormatter
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const valueSpanRef = useRef<HTMLSpanElement>(null);
  const startYRef = useRef<number>(0);
  const startValRef = useRef<number>(0);
  const currentValRef = useRef<number>(value);
  const isDraggingRef = useRef<boolean>(false);

  const onAudioDragRef = useRef(onAudioDrag);
  onAudioDragRef.current = onAudioDrag;

  const actualMin = min !== undefined ? min : 0;
  const actualMax = max !== undefined ? max : 100;
  const range = actualMax - actualMin;

  const formatValue = (val: number) => {
    if (displayFormatter) {
      return displayFormatter(val);
    }
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('thres') || lowerLabel.includes('seuil') || lowerLabel.includes('limiar')) {
      return `${val} dB`;
    }
    if (
      lowerLabel.includes('low') || lowerLabel.includes('mid') || lowerLabel.includes('high') ||
      lowerLabel.includes('grave') || lowerLabel.includes('médium') || lowerLabel.includes('aigu')
    ) {
      return `${val > 0 ? '+' : ''}${val}`;
    }
    if (lowerLabel.includes('ratio')) {
      return `${val}:1`;
    }
    if (min === undefined && max === undefined) {
      return `${val}%`;
    }
    return `${val}`;
  };

  useEffect(() => {
    currentValRef.current = value;
    if (valueSpanRef.current && !isDraggingRef.current) {
      valueSpanRef.current.textContent = disabled ? '—' : formatValue(value);
    }
  }, [value, disabled, min, max, label]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    containerRef.current?.setPointerCapture(e.pointerId);
    startYRef.current = e.clientY;
    startValRef.current = currentValRef.current;
    isDraggingRef.current = true;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !isDraggingRef.current || !containerRef.current?.hasPointerCapture(e.pointerId)) return;
    const dy = startYRef.current - e.clientY; // Dragging up increases value
    // Scale: 150px drag spans the entire range
    const delta = (dy / 150) * range;
    let newVal = startValRef.current + delta;
    newVal = Math.max(actualMin, Math.min(actualMax, newVal));
    
    if (step !== undefined) {
      newVal = Math.round(newVal / step) * step;
      const precision = (step.toString().split('.')[1] || '').length;
      newVal = parseFloat(newVal.toFixed(precision));
    } else {
      newVal = Math.round(newVal);
    }

    currentValRef.current = newVal;
    if (valueSpanRef.current) {
      valueSpanRef.current.textContent = formatValue(newVal);
    }
    if (onAudioDragRef.current) {
      onAudioDragRef.current(newVal);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (containerRef.current?.hasPointerCapture(e.pointerId)) {
      containerRef.current.releasePointerCapture(e.pointerId);
      isDraggingRef.current = false;
      onChange(currentValRef.current);
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`flex items-center justify-between px-2 py-0.5 text-[9px] font-bold select-none border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-[var(--cordel-text)] shadow-[1px_1px_0_var(--cordel-border)] transition-all ${
        disabled 
          ? 'opacity-35 cursor-not-allowed' 
          : 'cursor-row-resize active:translate-y-[0.5px] active:shadow-none'
      } ${className}`}
    >
      <span className="uppercase opacity-60 tracking-wider font-sans">{label}</span>
      <span ref={valueSpanRef} className="font-mono font-bold text-[10px] ml-1">
        {disabled ? '—' : formatValue(value)}
      </span>
    </div>
  );
};

export const DragNumberBox = React.memo(DragNumberBoxComponent);

