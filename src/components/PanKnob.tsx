import React from 'react';
import { PanKnobSvg } from './controls/PanKnobSvg';
import { usePanKnobInteraction } from './controls/usePanKnobInteraction';

interface PanKnobProps {
  trackId?: number;
  value: number; // -100 to 100
  onChange: (val: number) => void;
  defaultValue?: number;
  label?: string;
  showLabels?: boolean;
  panKnobRef?: React.RefObject<SVGGElement | null>;
}

export const PanKnob: React.FC<PanKnobProps> = ({
  trackId,
  value,
  onChange,
  defaultValue = 0,
  label = "Pan",
  showLabels = true,
  panKnobRef
}) => {
  const {
    containerRef,
    inputRef,
    setRotationRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    resetToDefault,
    handleInputChange,
  } = usePanKnobInteraction({ trackId, value, defaultValue, onChange, panKnobRef });

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resetToDefault();
  };

  const initialAngle = value * 1.35;
  const panTitle = `Pan: ${value === 0 ? 'Centro' : value > 0 ? 'D' + value : 'E' + Math.abs(value)}`;

  return (
    <div 
      className="flex flex-col items-center gap-0.5 select-none shrink-0 touch-none"
      onDoubleClick={handleDoubleClick}
    >
      <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60 cursor-default">{label}</span>
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        title={panTitle}
        className="relative w-11 h-11 flex items-center justify-center cursor-ns-resize touch-none select-none active:scale-95 transition-transform duration-75"
      >
        <PanKnobSvg
          setRotationRef={setRotationRef}
          initialAngle={initialAngle}
          inputRef={inputRef}
          value={value}
          label={label}
          onInputChange={handleInputChange}
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
