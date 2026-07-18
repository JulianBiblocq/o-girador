import React, { useEffect, useRef } from 'react';

interface MixerKnobProps {
  value: number;
  min: number;
  max: number;
  step?: number;
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

  const inputRef = useRef<HTMLInputElement>(null);
  const rotationGroupRef = useRef<SVGGElement>(null);
  const valueLabelRef = useRef<HTMLSpanElement>(null);

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
      const rounded = Math.round(val);
      return rounded > 0 ? `+${rounded}` : `${rounded}`;
    }
    return `${Math.round(val)}${unit}`;
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
    let val = startValueRef.current + (diffY / sweepRange) * range;
    
    // Clamp values
    val = Math.min(max, Math.max(min, val));
    
    // Magnetic snapping to 0 dB
    if (unit === 'dB' && Math.abs(val) < 0.8) {
      val = 0;
    }

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

    let val = parseFloat(inputRef.current?.value || String(value));
    
    // Magnetic snapping to 0 dB
    if (unit === 'dB' && Math.abs(val) < 0.8) {
      val = 0;
    }

    React.startTransition(() => {
      onChangeRef.current(val);
    });
  };

  // Keyboard accessibility
  const handleKeyboardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDraggingRef.current) return;
    let val = parseFloat(e.target.value);
    
    // Magnetic snapping to 0 dB
    if (unit === 'dB' && Math.abs(val) < 0.8) {
      val = 0;
    }
    
    updateVisuals(val);
    onChangeRef.current(val);
  };

  const initialAngle = getAngle(value);

  return (
    <div className="flex flex-col items-center select-none shrink-0" style={{ width: `${size + 12}px` }}>
      <span className="text-[7px] font-black uppercase tracking-wider text-[var(--cordel-text)]/40 text-center truncate w-full leading-none mb-0.5">
        {label}
      </span>
      <div 
        className="relative flex items-center justify-center cursor-pointer" 
        style={{ width: `${size}px`, height: `${size}px` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
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
      <span ref={valueLabelRef} className="text-[7.5px] font-black font-mono opacity-65 mt-0.5 leading-none">
        {formatValue(value)}
      </span>
    </div>
  );
};
