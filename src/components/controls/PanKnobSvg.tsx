import React from 'react';
import { buildPanBipolarArcPath } from './panKnobMath';
import type { PanCrownTickSpec } from './usePanSquadTicks';

interface PanKnobSvgProps {
  setRotationRef: (el: SVGGElement | null) => void;
  setTickGroupRef?: (idx: number, el: SVGGElement | null) => void;
  arcPathRef?: React.RefObject<SVGPathElement | null>;
  memberTicks?: readonly PanCrownTickSpec[];
  initialAngle: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: number;
  label: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const PanKnobSvg: React.FC<PanKnobSvgProps> = ({
  setRotationRef,
  setTickGroupRef,
  arcPathRef,
  memberTicks,
  initialAngle,
  inputRef,
  value,
  label,
  onInputChange,
}) => {
  return (
    <>
      <svg width="38" height="38" viewBox="0 0 32 32" className="pointer-events-none select-none overflow-visible">
        <circle cx="16" cy="16" r="13.2" fill="var(--cordel-bg)" stroke="var(--cordel-border)" strokeWidth="2" />
        <line x1="16" y1="2.8" x2="16" y2="5" stroke="var(--cordel-border)" strokeWidth="1.6" opacity="0.72" />
        <line x1="6.7" y1="25.3" x2="8.2" y2="23.8" stroke="var(--cordel-border)" strokeWidth="1.4" opacity="0.65" />
        <line x1="25.3" y1="25.3" x2="23.8" y2="23.8" stroke="var(--cordel-border)" strokeWidth="1.4" opacity="0.65" />

        <path
          ref={arcPathRef}
          data-pan-arc="1"
          d={buildPanBipolarArcPath(value)}
          fill="none"
          stroke="var(--cordel-wood)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {memberTicks && memberTicks.length > 0 && memberTicks.map((tick, idx) => {
          const effPan = tick.isFixedWorld
            ? Math.max(-100, Math.min(100, tick.baseOffset))
            : Math.max(-100, Math.min(100, tick.baseOffset + value));
          const angle = effPan * 1.35;
          const isMasterStud = tick.kind === 'linked-master';
          const isLinkedStud = isMasterStud || tick.kind === 'linked-slave' || tick.kind === 'bus-child';
          return (
            <g
              key={idx}
              data-testid={`pan-crown-member-tick-${idx}`}
              ref={setTickGroupRef ? (el) => setTickGroupRef(idx, el) : undefined}
              transform={`rotate(${angle} 16 16)`}
            >
              {isLinkedStud ? (
                <polygon
                  points={isMasterStud ? '16,-1.6 17.8,0.2 16,2.0 14.2,0.2' : '16,-1.1 17.4,0.3 16,1.7 14.6,0.3'}
                  fill={isMasterStud || tick.isLeader ? 'var(--cordel-wood)' : 'var(--cordel-parchment-bg)'}
                  stroke="var(--cordel-ink-dark)"
                  strokeWidth="0.75"
                />
              ) : (
                <line
                  x1="16"
                  y1={tick.isLeader ? '-1.4' : '-0.8'}
                  x2="16"
                  y2={tick.isLeader ? '2.2' : '1.9'}
                  stroke={tick.isLeader ? 'var(--cordel-wood)' : 'var(--cordel-text)'}
                  strokeWidth={tick.isLeader ? '2.0' : '1.4'}
                  strokeLinecap="round"
                  opacity={tick.isLeader ? '0.95' : '0.78'}
                />
              )}
            </g>
          );
        })}

        <g ref={setRotationRef} transform={`rotate(${initialAngle} 16 16)`}>
          <line x1="16" y1="16" x2="16" y2="5" stroke="var(--cordel-text)" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="16" cy="5" r="1.6" fill="var(--cordel-wood)" />
        </g>
      </svg>

      <input
        ref={inputRef}
        type="range"
        min="-100"
        max="100"
        defaultValue={value}
        onChange={onInputChange}
        aria-label={label || 'Pan'}
        className="sr-only"
      />
    </>
  );
};
