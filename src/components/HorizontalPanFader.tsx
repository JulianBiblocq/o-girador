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

  const leftLabel = lang === 'fr' ? 'G' : 'L';
  const rightLabel = lang === 'fr' ? 'D' : 'R';

  return (
    <div className={`flex items-center gap-1.5 w-full select-none ${className}`}>
      <span className="text-[10px] font-black text-[var(--cordel-text)]/40 w-3 text-center font-mono">{leftLabel}</span>
      
      {/* Track container */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex-grow h-4 flex items-center relative cursor-col-resize"
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

      <span className="text-[10px] font-black text-[var(--cordel-text)]/40 w-3 text-center font-mono">{rightLabel}</span>
    </div>
  );
};
