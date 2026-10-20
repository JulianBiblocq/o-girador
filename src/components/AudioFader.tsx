import React from 'react';
import { AudioFaderTarget } from './controls/audioFaderSync';
import { useAudioFaderInteraction } from './controls/useAudioFaderInteraction';

interface AudioFaderProps {
  value: number;
  onChange: (val: number) => void;
  audioTarget?: AudioFaderTarget;
  trackId?: number;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const AudioFader: React.FC<AudioFaderProps> = ({ 
  value, 
  onChange, 
  audioTarget, 
  trackId, 
  min = 0, 
  max = 100, 
  step = 1, 
  className, 
  style 
}) => {
  const numMin = parseFloat(String(min));
  const numMax = parseFloat(String(max));
  const numStep = parseFloat(String(step));

  const {
    containerRef,
    visualThumbRef,
    getPercentage,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useAudioFaderInteraction({
    value, numMin, numMax, numStep, audioTarget, trackId, onChange
  });

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative select-none touch-none cursor-pointer ${className || ''}`}
      style={{ ...style, position: 'relative', display: 'flex', alignItems: 'center' }}
    >
      <div
        ref={visualThumbRef}
        className="absolute w-3 h-4 bg-[var(--cordel-border)] border border-[var(--cordel-bg)] -translate-x-1/2 -translate-y-1/2 top-1/2 pointer-events-none"
        style={{ left: `${getPercentage(value)}%` }}
      />
    </div>
  );
};
