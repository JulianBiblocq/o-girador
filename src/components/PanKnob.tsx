import React, { useState, useEffect, startTransition } from 'react';
import { Language } from '../types';
import { channels } from '../hooks/useAudioSync';

interface PanKnobProps {
  trackId?: number; // Optional if used for something else, but needed for audio sync
  value: number; // -100 to 100
  onChange: (val: number) => void;
  label?: string;
}

export const PanKnob: React.FC<PanKnobProps> = ({ trackId, value, onChange, label = "Pan" }) => {
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  const handleDrag = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setLocalVal(val);
    if (trackId !== undefined && channels[trackId]) {
      // Direct Tone.js smoothing without hitting the global store
      channels[trackId].pan.rampTo(val / 100, 0.05);
    }
  };

  const handleCommit = () => {
    if (localVal !== value) {
      startTransition(() => {
        onChange(localVal);
      });
    }
  };

  // Map value (-100 to 100) to rotation angle in degrees (-135 to 135)
  const angle = localVal * 1.35;

  return (
    <div className="flex flex-col items-center gap-0.5 select-none shrink-0">
      <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">{label}</span>
      <div className="relative w-11 h-11 flex items-center justify-center cursor-pointer">
        {/* SVG dial representing the potentiometer */}
        <svg width="38" height="38" viewBox="0 0 32 32" className="transition-transform duration-100">
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
          value={localVal}
          onChange={handleDrag}
          onMouseUp={handleCommit}
          onTouchEnd={handleCommit}
          className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full"
          title={`Pan: ${localVal === 0 ? 'C' : localVal > 0 ? 'R' + localVal : 'L' + Math.abs(localVal)}`}
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
