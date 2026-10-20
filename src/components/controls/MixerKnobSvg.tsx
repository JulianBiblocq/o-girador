import React from 'react';

interface MixerKnobSvgProps {
  size: number;
  isGain: boolean;
  color: string;
  initialAngle: number;
  rotationGroupRef: React.RefObject<SVGGElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  min: number;
  max: number;
  step?: number;
  value: number;
  onKeyboardChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const MixerKnobSvg: React.FC<MixerKnobSvgProps> = ({
  size,
  isGain,
  color,
  initialAngle,
  rotationGroupRef,
  inputRef,
  min,
  max,
  step,
  value,
  onKeyboardChange,
}) => {
  return (
    <>
      <svg width={size} height={size} viewBox="0 0 32 32" className="transition-transform duration-100 pointer-events-none">
        <circle 
          cx="16" 
          cy="16" 
          r="13.5" 
          fill={isGain ? 'var(--cordel-text)' : color} 
          stroke="var(--cordel-border)" 
          strokeWidth="1.5" 
        />
        <line x1="6.5" y1="25.5" x2="8.5" y2="23.5" stroke="var(--cordel-border)" strokeWidth="0.8" opacity="0.3" />
        <line x1="25.5" y1="25.5" x2="23.5" y2="23.5" stroke="var(--cordel-border)" strokeWidth="0.8" opacity="0.3" />
        <line x1="16" y1="2" x2="16" y2="4.5" stroke="var(--cordel-border)" strokeWidth="0.8" opacity="0.4" />
        
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

      <input
        ref={inputRef}
        type="range"
        min={min}
        max={max}
        step={step}
        defaultValue={value}
        onChange={onKeyboardChange}
        className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
      />
    </>
  );
};
