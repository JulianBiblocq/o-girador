import React, { useEffect, useRef } from 'react';
import { channels, busChannels } from '../hooks/useAudioSync';
import { useSequencerStore } from '../stores/useSequencerStore';
import { instrumentsConfig } from '../data';

interface PanKnobProps {
  trackId?: number; // Needed for audio sync
  value: number; // -100 to 100
  onChange: (val: number) => void;
  label?: string;
  showLabels?: boolean;
}

export const PanKnob: React.FC<PanKnobProps> = ({ trackId, value, onChange, label = "Pan", showLabels = true }) => {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const isDraggingRef = useRef(false);
  const lastAudioUpdateTimeRef = useRef(0);
  const THROTTLE_MS = 25; // 40 Hz limit

  const inputRef = useRef<HTMLInputElement>(null);
  const rotationGroupRef = useRef<SVGGElement>(null);
  const valueLabelRef = useRef<HTMLSpanElement>(null);

  const updateVisuals = (val: number) => {
    if (rotationGroupRef.current) {
      const angle = val * 1.35;
      rotationGroupRef.current.setAttribute('transform', `rotate(${angle} 16 16)`);
    }
    if (inputRef.current) {
      inputRef.current.title = `Pan: ${val === 0 ? 'Centro' : val > 0 ? 'D' + val : 'E' + Math.abs(val)}`;
    }
  };

  useEffect(() => {
    if (!isDraggingRef.current) {
      if (inputRef.current) {
        inputRef.current.value = String(value);
      }
      updateVisuals(value);
    }
  }, [value]);

  const updateAudio = (val: number, force = false) => {
    const now = performance.now();
    if (!force && now - lastAudioUpdateTimeRef.current < THROTTLE_MS) {
      return;
    }
    lastAudioUpdateTimeRef.current = now;

    if (trackId !== undefined) {
      const track = useSequencerStore.getState().tracks.find(t => t.id === trackId);
      if (track) {
        const targetPan = val / 100;
        if (track.isBusFolder) {
          if (busChannels && busChannels[track.id]) {
            busChannels[track.id].pan.rampTo(targetPan, 0.05);
          }
        } else {
          if (channels && channels[track.id]) {
            channels[track.id].pan.rampTo(targetPan, 0.05);
          }
        }
      }
    }
  };

  const handleDrag = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    updateVisuals(val);
    updateAudio(val, false);
  };

  const handleCommit = (e: React.SyntheticEvent) => {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    isDraggingRef.current = false;
    updateVisuals(val);
    updateAudio(val, true);
    React.startTransition(() => {
      onChangeRef.current(val);
    });
  };

  const handlePointerDown = () => {
    isDraggingRef.current = true;
  };

  const initialAngle = value * 1.35;

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
          <g ref={rotationGroupRef} transform={`rotate(${initialAngle} 16 16)`}>
            <line x1="16" y1="16" x2="16" y2="5" stroke="var(--cordel-border)" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="16" cy="5" r="1.5" fill="var(--cordel-wood)" />
          </g>
        </svg>

        {/* Hidden native slider overlay with touch-none to prevent default scrolling on mobile */}
        <input
          ref={inputRef}
          type="range"
          min="-100"
          max="100"
          defaultValue={value}
          onChange={handleDrag}
          onPointerDown={handlePointerDown}
          onPointerUp={handleCommit}
          onKeyUp={handleCommit}
          onBlur={handleCommit}
          className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full touch-none"
        />
      </div>
      {showLabels && (
        <div className="flex justify-between w-full px-1.5 text-[8px] font-bold opacity-60">
          <span>E</span>
          <span>D</span>
        </div>
      )}
    </div>
  );
};
