import React from 'react';

interface PanKnobSvgProps {
  setRotationRef: (el: SVGGElement | null) => void;
  initialAngle: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: number;
  label: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const PanKnobSvg: React.FC<PanKnobSvgProps> = ({
  setRotationRef,
  initialAngle,
  inputRef,
  value,
  label,
  onInputChange,
}) => {
  return (
    <>
      <svg width="38" height="38" viewBox="0 0 32 32" className="pointer-events-none select-none overflow-visible">
        <circle cx="16" cy="16" r="14" fill="var(--cordel-bg)" stroke="var(--cordel-border)" strokeWidth="2" />
        <line x1="16" y1="2" x2="16" y2="4" stroke="var(--cordel-border)" strokeWidth="1.5" opacity="0.4" />
        <line x1="2" y1="16" x2="4" y2="16" stroke="var(--cordel-border)" strokeWidth="1.5" opacity="0.4" />
        <line x1="30" y1="16" x2="28" y2="16" stroke="var(--cordel-border)" strokeWidth="1.5" opacity="0.4" />

        <g ref={setRotationRef} transform={`rotate(${initialAngle} 16 16)`}>
          <line x1="16" y1="16" x2="16" y2="5" stroke="var(--cordel-border)" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="16" cy="5" r="1.5" fill="var(--cordel-wood)" />
        </g>
      </svg>

      <input
        ref={inputRef}
        type="range"
        min="-100"
        max="100"
        defaultValue={value}
        onChange={onInputChange}
        aria-label={label}
        className="sr-only"
      />
    </>
  );
};
