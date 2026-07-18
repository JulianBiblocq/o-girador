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
  mode?: 'unipolar' | 'bipolar';
  displayFormatter?: (val: number) => string;
  style?: React.CSSProperties;
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
  mode = 'unipolar',
  displayFormatter,
  style
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

  // Helper to calculate fill left and width percentages
  const getFillStyles = (val: number) => {
    if (range <= 0) return { left: '0%', width: '0%' };

    if (mode === 'bipolar') {
      const posZero = Math.max(0, Math.min(100, ((0 - actualMin) / range) * 100));
      const posVal = Math.max(0, Math.min(100, ((val - actualMin) / range) * 100));
      if (val >= 0) {
        return {
          left: `${posZero}%`,
          width: `${posVal - posZero}%`
        };
      } else {
        return {
          left: `${posVal}%`,
          width: `${posZero - posVal}%`
        };
      }
    } else {
      const pct = Math.max(0, Math.min(100, ((val - actualMin) / range) * 100));
      return {
        left: '0%',
        width: `${pct}%`
      };
    }
  };

  useEffect(() => {
    currentValRef.current = value;
    if (valueSpanRef.current && !isDraggingRef.current) {
      valueSpanRef.current.textContent = disabled ? '—' : formatValue(value);
    }
    if (containerRef.current && !isDraggingRef.current) {
      const fillStyles = getFillStyles(value);
      containerRef.current.style.setProperty('--fill-left', fillStyles.left);
      containerRef.current.style.setProperty('--fill-width', fillStyles.width);
    }
  }, [value, disabled, min, max, label, mode]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    containerRef.current?.setPointerCapture(e.pointerId);
    containerRef.current?.classList.add('is-dragging');
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
    
    // Direct DOM manipulation for fast rendering (Zero Render/Layout Thrashing)
    if (valueSpanRef.current) {
      valueSpanRef.current.textContent = formatValue(newVal);
    }
    if (containerRef.current) {
      const fillStyles = getFillStyles(newVal);
      containerRef.current.style.setProperty('--fill-left', fillStyles.left);
      containerRef.current.style.setProperty('--fill-width', fillStyles.width);
    }
    if (onAudioDragRef.current) {
      onAudioDragRef.current(newVal);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (containerRef.current?.hasPointerCapture(e.pointerId)) {
      containerRef.current.releasePointerCapture(e.pointerId);
      containerRef.current.classList.remove('is-dragging');
      isDraggingRef.current = false;
      onChange(currentValRef.current);
    }
  };

  const initialStyles = getFillStyles(value);
  const zeroPos = range > 0 ? Math.max(0, Math.min(100, ((0 - actualMin) / range) * 100)) : 50;

  const styleObject = {
    '--fill-left': initialStyles.left,
    '--fill-width': initialStyles.width,
    '--zero-pos': `${zeroPos}%`,
    '--show-center-line': mode === 'bipolar' ? 'block' : 'none',
  } as React.CSSProperties;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ ...styleObject, ...style }}
      className={`digital-fader flex items-center justify-between px-1.5 py-0.5 text-[9px] font-bold select-none border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-[var(--cordel-text)] shadow-[1px_1px_0_var(--cordel-border)] transition-all ${
        disabled 
          ? 'opacity-35 cursor-not-allowed' 
          : 'cursor-row-resize active:translate-y-[0.5px] active:shadow-none'
      } ${className}`}
    >
      <span className="uppercase opacity-60 tracking-wider font-sans">{label}</span>
      <span ref={valueSpanRef} className="font-mono font-bold text-[10px] ml-1 w-[24px] text-right shrink-0">
        {disabled ? '—' : formatValue(value)}
      </span>
    </div>
  );
};

export const DragNumberBox = React.memo(DragNumberBoxComponent);
