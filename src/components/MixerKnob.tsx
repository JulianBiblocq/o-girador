import React from 'react';
import { getKnobAngle, formatKnobValue } from './controls/mixerKnobMath';
import { useMixerKnobInteraction } from './controls/useMixerKnobInteraction';
import { MixerKnobSvg } from './controls/MixerKnobSvg';

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
  size?: number;
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
  const {
    inputRef,
    rotationGroupRef,
    valueLabelRef,
    knobContainerRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleKeyboardChange,
    resetToDefault,
  } = useMixerKnobInteraction({
    value, min, max, step, decimals, defaultValue, onChange, onAudioDrag, label, unit
  });

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resetToDefault();
  };

  const initialAngle = getKnobAngle(value, min, max);
  const isLarge = size >= 32;

  return (
    <div 
      className="flex flex-col items-center select-none shrink-0 touch-none" 
      style={{ width: isLarge ? `${Math.min(size + 24, 70)}px` : `${size + 14}px`, touchAction: 'none' }}
      onDoubleClick={handleDoubleClick}
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
        <MixerKnobSvg
          size={size}
          isGain={isGain}
          color={color}
          initialAngle={initialAngle}
          rotationGroupRef={rotationGroupRef}
          inputRef={inputRef}
          min={min}
          max={max}
          step={step}
          value={value}
          onKeyboardChange={handleKeyboardChange}
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
        {formatKnobValue(value, unit, decimals)}
      </span>
    </div>
  );
};
