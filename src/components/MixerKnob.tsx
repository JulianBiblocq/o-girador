import React, { useEffect, useRef } from 'react';

interface MixerKnobProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  decimals?: number;
  defaultValue?: number;
  onChange: (val: number) => void;
  onAudioDrag?: (val: number) => void;
  label: string;
  unit?: string;
  size?: number; // size in pixels of the container
  color?: string;
  isGain?: boolean;
}

export const MixerKnob: React.FC<MixerKnobProps> = ({
  value,
  min,
  max,
  step = 1,
  decimals,
  defaultValue = 0,
  onChange,
  onAudioDrag,
  label,
  unit = '',
  size = 26,
  color = 'var(--cordel-border)',
  isGain = false
}) => {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onAudioDragRef = useRef(onAudioDrag);
  onAudioDragRef.current = onAudioDrag;

  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startValueRef = useRef(0);
  const lastTapTimeRef = useRef(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const rotationGroupRef = useRef<SVGGElement>(null);
  const valueLabelRef = useRef<HTMLSpanElement>(null);
  const knobContainerRef = useRef<HTMLDivElement>(null);

  const getAngle = (val: number) => {
    // Map value to angle range: -135 to 135 degrees
    const ratio = (val - min) / (max - min);
    return -135 + ratio * 270;
  };

  const formatValue = (val: number) => {
    if (unit === 'Hz') {
      if (val >= 1000) {
        return `${(val / 1000).toFixed(1).replace('.0', '')}k`;
      }
      return `${Math.round(val)}`;
    }
    if (unit === 'dB') {
      if (decimals !== undefined && decimals > 0) {
        const fixed = Math.abs(val).toFixed(decimals);
        if (val > 0) return `+${fixed} dB`;
        if (val < 0) return `-${fixed} dB`;
        return `0.0 dB`;
      }
      const rounded = Math.round(val);
      return rounded > 0 ? `+${rounded}` : `${rounded}`;
    }
    return `${Math.round(val)}${unit}`;
  };

  const quantizeValue = (rawVal: number) => {
    let val = Math.min(max, Math.max(min, rawVal));
    if (step) {
      val = Math.round(val / step) * step;
    }
    // Fine magnetic snapping to center / 0
    const snapThreshold = step ? step * 0.75 : 0.8;
    const targetZero = defaultValue !== undefined ? defaultValue : 0;
    if (unit === 'dB' && Math.abs(val - targetZero) < snapThreshold) {
      val = targetZero;
    }
    return val;
  };

  const updateVisuals = (val: number) => {
    if (rotationGroupRef.current) {
      const angle = getAngle(val);
      rotationGroupRef.current.setAttribute('transform', `rotate(${angle} 16 16)`);
    }
    if (valueLabelRef.current) {
      valueLabelRef.current.textContent = formatValue(val);
    }
    if (inputRef.current) {
      inputRef.current.title = `${label}: ${formatValue(val)}`;
      inputRef.current.value = String(val);
    }
  };

  const resetToDefault = () => {
    const resetVal = defaultValue !== undefined ? defaultValue : 0;
    updateVisuals(resetVal);
    if (onAudioDragRef.current) {
      onAudioDragRef.current(resetVal);
    }
    React.startTransition(() => {
      onChangeRef.current(resetVal);
    });
  };

  useEffect(() => {
    if (!isDraggingRef.current) {
      updateVisuals(value);
    }
  }, [value]);

  // Pointer drag events for precise vertical dragging
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    startValueRef.current = value;
    
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    
    const diffY = startYRef.current - e.clientY; // drag up is positive
    
    // Sensitivity: 150px vertical movement for full sweep range
    const sweepRange = 150;
    const range = max - min;
    const rawVal = startValueRef.current + (diffY / sweepRange) * range;
    const val = quantizeValue(rawVal);

    updateVisuals(val);

    // Call real-time audio update
    if (onAudioDragRef.current) {
      onAudioDragRef.current(val);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    const rawVal = parseFloat(inputRef.current?.value || String(value));
    const val = quantizeValue(rawVal);

    React.startTransition(() => {
      onChangeRef.current(val);
    });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resetToDefault();
  };

  // Keyboard accessibility
  const handleKeyboardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDraggingRef.current) return;
    const rawVal = parseFloat(e.target.value);
    const val = quantizeValue(rawVal);
    
    updateVisuals(val);
    onChangeRef.current(val);
  };

  useEffect(() => {
    const el = knobContainerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      const now = performance.now();
      if (now - lastTapTimeRef.current < 300) {
        // Double-tap rapide tactile détecté (< 300ms)
        e.preventDefault();
        lastTapTimeRef.current = 0;
        resetToDefault();
        return;
      }
      lastTapTimeRef.current = now;

      if (e.touches.length > 0) {
        e.preventDefault();
        isDraggingRef.current = true;
        startYRef.current = e.touches[0].clientY;
        startValueRef.current = value;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current && e.touches.length > 0) {
        e.preventDefault();
        const diffY = startYRef.current - e.touches[0].clientY;
        const sweepRange = 150;
        const range = max - min;
        const rawVal = startValueRef.current + (diffY / sweepRange) * range;
        const val = quantizeValue(rawVal);

        updateVisuals(val);
        if (onAudioDragRef.current) {
          onAudioDragRef.current(val);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isDraggingRef.current) {
        e.preventDefault();
        isDraggingRef.current = false;
        const rawVal = parseFloat(inputRef.current?.value || String(value));
        const val = quantizeValue(rawVal);
        React.startTransition(() => {
          onChangeRef.current(val);
        });
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [min, max, value, unit, step, defaultValue]);

  const initialAngle = getAngle(value);
  const isLarge = size >= 32;

  return (
    <div 
      className="flex flex-col items-center select-none shrink-0 touch-none" 
      style={{ width: isLarge ? `${Math.min(size + 24, 70)}px` : `${size + 14}px`, touchAction: 'none' }}
    >
      <span className={
        isLarge 
          ? "text-[9px] font-cactus font-bold uppercase tracking-wider text-[var(--cordel-text)] opacity-85 text-center whitespace-nowrap leading-none mb-1 cursor-default"
          : "text-[7px] font-black uppercase tracking-wider text-[var(--cordel-text)]/40 text-center truncate w-full leading-none mb-0.5"
      }>
        {label}
      </span>
      <div 
        ref={knobContainerRef}
        className="relative flex items-center justify-center cursor-pointer touch-none select-none" 
        style={{ width: `${size}px`, height: `${size}px`, touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        <svg width={size} height={size} viewBox="0 0 32 32" className="transition-transform duration-100 pointer-events-none">
          {/* Dial body */}
          <circle 
            cx="16" 
            cy="16" 
            r="13.5" 
            fill={isGain ? 'var(--cordel-text)' : color} 
            stroke="var(--cordel-border)" 
            strokeWidth="1.5" 
          />
          
          {/* Min, Center, Max markers */}
          <line x1="6.5" y1="25.5" x2="8.5" y2="23.5" stroke="var(--cordel-border)" strokeWidth="0.8" opacity="0.3" />
          <line x1="25.5" y1="25.5" x2="23.5" y2="23.5" stroke="var(--cordel-border)" strokeWidth="0.8" opacity="0.3" />
          <line x1="16" y1="2" x2="16" y2="4.5" stroke="var(--cordel-border)" strokeWidth="0.8" opacity="0.4" />
          
          {/* Rotatable indicator pointer */}
          <g ref={rotationGroupRef} transform={`rotate(${initialAngle} 16 16)`}>
            <line 
              x1="16" 
              y1="16" 
              x2="16" 
              y2="5" 
              stroke="var(--cordel-bg)" 
              strokeWidth="2.2" 
              strokeLinecap="round" 
            />
            <circle 
              cx="16" 
              cy="5" 
              r="1.2" 
              fill="var(--cordel-bg)" 
            />
          </g>
        </svg>

        {/* Hidden input overlay for accessibility */}
        <input
          ref={inputRef}
          type="range"
          min={min}
          max={max}
          step={step}
          defaultValue={value}
          onChange={handleKeyboardChange}
          className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
        />
      </div>
      <span 
        ref={valueLabelRef} 
        className={
          isLarge
            ? "text-[9px] font-black font-mono text-[var(--cordel-text)] opacity-90 mt-1 leading-none"
            : "text-[7.5px] font-black font-mono opacity-65 mt-0.5 leading-none"
        }
      >
        {formatValue(value)}
      </span>
    </div>
  );
};
