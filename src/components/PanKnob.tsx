import React, { useEffect, useRef } from 'react';
import { channels, busChannels } from '../hooks/useAudioSync';
import { useSequencerStore } from '../stores/useSequencerStore';

interface PanKnobProps {
  trackId?: number; // Needed for audio sync
  value: number; // -100 to 100
  onChange: (val: number) => void;
  label?: string;
  showLabels?: boolean;
  panKnobRef?: React.RefObject<SVGGElement | null>;
}

export const PanKnob: React.FC<PanKnobProps> = ({
  trackId,
  value,
  onChange,
  label = "Pan",
  showLabels = true,
  panKnobRef
}) => {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const startValueRef = useRef(0);
  const lastAudioUpdateTimeRef = useRef(0);
  const THROTTLE_MS = 25; // 40 Hz limit for audio updates during drag

  const inputRef = useRef<HTMLInputElement>(null);
  const rotationGroupRef = useRef<SVGGElement>(null);

  const setRotationRef = (el: SVGGElement | null) => {
    (rotationGroupRef as React.MutableRefObject<SVGGElement | null>).current = el;
    if (panKnobRef) {
      (panKnobRef as React.MutableRefObject<SVGGElement | null>).current = el;
    }
  };

  const updateVisuals = (val: number) => {
    if (rotationGroupRef.current) {
      rotationGroupRef.current.style.transform = '';
      const angle = val * 1.35; // Standard sweep -135° to +135°
      rotationGroupRef.current.setAttribute('transform', `rotate(${angle} 16 16)`);
    }
    if (inputRef.current) {
      inputRef.current.value = String(val);
      inputRef.current.title = `Pan: ${val === 0 ? 'Centro' : val > 0 ? 'D' + val : 'E' + Math.abs(val)}`;
    }
  };

  useEffect(() => {
    if (!isDraggingRef.current) {
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

  // Pointer drag events for precise vertical/horizontal dragging with pointer capture
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    startXRef.current = e.clientX;
    startValueRef.current = value;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;

    // Movement: dragging UP or RIGHT increases (towards D/Right), DOWN or LEFT decreases (towards E/Left)
    const diffY = startYRef.current - e.clientY;
    const diffX = e.clientX - startXRef.current;
    const diff = Math.abs(diffY) >= Math.abs(diffX) ? diffY : diffX;

    // ~140px of sweep range covers the 200 units (-100 to +100)
    let val = startValueRef.current + (diff / 140) * 200;
    val = Math.max(-100, Math.min(100, Math.round(val)));

    // Magnetic center snap around 0 (+/- 2 units)
    if (Math.abs(val) <= 2) {
      val = 0;
    }

    updateVisuals(val);
    updateAudio(val, false);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    const diffY = startYRef.current - e.clientY;
    const diffX = e.clientX - startXRef.current;
    const diff = Math.abs(diffY) >= Math.abs(diffX) ? diffY : diffX;

    let val = startValueRef.current + (diff / 140) * 200;
    val = Math.max(-100, Math.min(100, Math.round(val)));
    if (Math.abs(val) <= 2) {
      val = 0;
    }

    updateVisuals(val);
    updateAudio(val, true);

    React.startTransition(() => {
      onChangeRef.current(val);
    });
  };

  // Double-click to snap back to exact center (0)
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateVisuals(0);
    updateAudio(0, true);
    React.startTransition(() => {
      onChangeRef.current(0);
    });
  };

  // Accessibility keyboard handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) val = 0;
    if (Math.abs(val) <= 2) val = 0;
    updateVisuals(val);
    updateAudio(val, true);
    React.startTransition(() => {
      onChangeRef.current(val);
    });
  };

  const initialAngle = value * 1.35;
  const panTitle = `Pan: ${value === 0 ? 'Centro' : value > 0 ? 'D' + value : 'E' + Math.abs(value)}`;

  return (
    <div className="flex flex-col items-center gap-0.5 select-none shrink-0 touch-none">
      <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">{label}</span>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        title={panTitle}
        className="relative w-11 h-11 flex items-center justify-center cursor-ns-resize touch-none select-none active:scale-95 transition-transform duration-75"
      >
        {/* SVG dial representing the potentiometer */}
        <svg width="38" height="38" viewBox="0 0 32 32" className="pointer-events-none select-none overflow-visible">
          {/* Dial body */}
          <circle cx="16" cy="16" r="14" fill="var(--cordel-bg)" stroke="var(--cordel-border)" strokeWidth="2" />

          {/* Subtle tick marks at L, C, R */}
          <line x1="16" y1="2" x2="16" y2="4" stroke="var(--cordel-border)" strokeWidth="1.5" opacity="0.4" />
          <line x1="2" y1="16" x2="4" y2="16" stroke="var(--cordel-border)" strokeWidth="1.5" opacity="0.4" />
          <line x1="30" y1="16" x2="28" y2="16" stroke="var(--cordel-border)" strokeWidth="1.5" opacity="0.4" />

          {/* Rotatable indicator pointer strictly centered on (16, 16) */}
          <g ref={setRotationRef} transform={`rotate(${initialAngle} 16 16)`}>
            <line x1="16" y1="16" x2="16" y2="5" stroke="var(--cordel-border)" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="16" cy="5" r="1.5" fill="var(--cordel-wood)" />
          </g>
        </svg>

        {/* Hidden screen-reader accessibility slider for keyboard navigation */}
        <input
          ref={inputRef}
          type="range"
          min="-100"
          max="100"
          defaultValue={value}
          onChange={handleInputChange}
          aria-label={label}
          className="sr-only"
        />
      </div>
      {showLabels && (
        <div className="flex justify-between w-full px-1.5 text-[8px] font-bold opacity-60 pointer-events-none">
          <span>E</span>
          <span>D</span>
        </div>
      )}
    </div>
  );
};
