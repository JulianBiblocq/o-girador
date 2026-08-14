import React, { useRef, useEffect } from 'react';

interface HorizontalPanFaderProps {
  value: number; // -100 to 100
  onChange: (val: number) => void;
  className?: string;
  lang?: 'fr' | 'pt';
}

export const HorizontalPanFader: React.FC<HorizontalPanFaderProps> = ({ 
  value, 
  onChange, 
  className = '',
  lang = 'pt'
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const currentValRef = useRef<number>(value);

  const getPositionPercent = (val: number) => {
    // Map -100..100 to 0..100%
    return ((val + 100) / 200) * 100;
  };

  const updateVisuals = (val: number) => {
    if (thumbRef.current) {
      thumbRef.current.style.left = `${getPositionPercent(val)}%`;
    }
  };

  useEffect(() => {
    currentValRef.current = value;
    updateVisuals(value);
  }, [value]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    trackRef.current?.setPointerCapture(e.pointerId);
    handleDrag(e);
  };

  const handleDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percent = Math.max(0, Math.min(100, (x / width) * 100));
    // Map 0..100% back to -100..100
    let val = Math.round((percent / 100) * 200 - 100);
    // Snap to center (0) if close
    if (Math.abs(val) < 8) val = 0;
    
    currentValRef.current = val;
    updateVisuals(val);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current?.hasPointerCapture(e.pointerId)) return;
    handleDrag(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (trackRef.current?.hasPointerCapture(e.pointerId)) {
      trackRef.current.releasePointerCapture(e.pointerId);
      onChange(currentValRef.current);
    }
  };

  const isDraggingRef = useRef(false);

  const calculateValFromX = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return currentValRef.current;
    const rect = track.getBoundingClientRect();
    const x = clientX - rect.left;
    const width = rect.width;
    const percent = Math.max(0, Math.min(100, (x / width) * 100));
    let val = Math.round((percent / 100) * 200 - 100);
    if (Math.abs(val) < 8) val = 0;
    return val;
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        isDraggingRef.current = true;
        const touch = e.touches[0];
        const val = calculateValFromX(touch.clientX);
        currentValRef.current = val;
        updateVisuals(val);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current && e.touches.length > 0) {
        e.preventDefault();
        const touch = e.touches[0];
        const val = calculateValFromX(touch.clientX);
        currentValRef.current = val;
        updateVisuals(val);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isDraggingRef.current) {
        e.preventDefault();
        isDraggingRef.current = false;
        const touch = e.changedTouches[0] || e.touches[0];
        if (touch) {
          const val = calculateValFromX(touch.clientX);
          currentValRef.current = val;
          updateVisuals(val);
        }
        onChange(currentValRef.current);
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
  }, []);

  return (
    <div className={`flex items-center w-full select-none touch-none ${className}`}>
      {/* Track container */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex-grow h-4 flex items-center relative cursor-col-resize touch-none"
      >
        {/* Horizontal Line */}
        <div className="w-full h-1 bg-[var(--cordel-border)] border border-[var(--cordel-bg)] pointer-events-none"></div>
        {/* Center tick - reinforced */}
        <div className="absolute left-1/2 -translate-x-1/2 w-[2.5px] h-3 bg-[var(--cordel-border)] z-5 pointer-events-none"></div>
        {/* Thumb */}
        <div
          ref={thumbRef}
          className="absolute w-3 h-3.5 bg-[var(--cordel-border)] border border-[var(--cordel-bg)] -translate-x-1/2 shadow-[0_1px_3px_rgba(0,0,0,0.2)] pointer-events-none"
          style={{ left: `${getPositionPercent(value)}%` }}
        ></div>
      </div>
    </div>
  );
};
