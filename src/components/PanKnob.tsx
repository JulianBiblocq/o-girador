import React from 'react';
import { Language } from '../types';

interface PanKnobProps {
  value: number; // -100 to 100
  onChange: (val: number) => void;
  label?: string;
}

export const PanKnob: React.FC<PanKnobProps> = ({ value, onChange, label = "Pan" }) => {
  // Map value (-100 to 100) to rotation angle in degrees (-135 to 135)
  const angle = value * 1.35;

  return (
    <div className="flex flex-col items-center gap-0.5 select-none shrink-0">
      <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">{label}</span>
      <div className="relative w-9 h-9 flex items-center justify-center cursor-pointer">
        {/* SVG dial representing the potentiometer */}
        <svg width="32" height="32" viewBox="0 0 32 32" className="transition-transform duration-100">
          {/* Dial body */}
          <circle cx="16" cy="16" r="14" fill="var(--cordel-bg)" stroke="var(--cordel-border)" strokeWidth="2" />
          
          {/* Subtle tick marks at L, C, R */}
          <line x1="16" y1="2" x2="16" y2="4" stroke="var(--cordel-border)" strokeWidth="1.5" opacity="0.3" />
          <line x1="2" y1="16" x2="4" y2="16" stroke="var(--cordel-border)" strokeWidth="1.5" opacity="0.3" />
          <line x1="30" y1="16" x2="28" y2="16" stroke="var(--cordel-border)" strokeWidth="1.5" opacity="0.3" />
          
          {/* Rotatable indicator pointer */}
          <g transform={`rotate(${angle} 16 16)`}>
            <line x1="16" y1="16" x2="16" y2="5" stroke="var(--cordel-border)" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="16" cy="5" r="1.5" fill="var(--cordel-wood)" />
          </g>
        </svg>

        {/* Hidden native slider overlay to capture drag gestures cleanly on desktop & mobile */}
        <input
          type="range"
          min="-100"
          max="100"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full"
          title={`Pan: ${value === 0 ? 'C' : value > 0 ? 'R' + value : 'L' + Math.abs(value)}`}
        />
      </div>
      <div className="flex justify-between w-full px-1 text-[8px] font-bold opacity-60">
        <span>L</span>
        <span>{value === 0 ? 'C' : value > 0 ? `R${value}` : `L${Math.abs(value)}`}</span>
        <span>R</span>
      </div>
    </div>
  );
};
