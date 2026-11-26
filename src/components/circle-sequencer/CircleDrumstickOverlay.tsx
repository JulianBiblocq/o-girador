import React from 'react';
import { getTrackRadius } from './circleGeometry';

interface CircleDrumstickOverlayProps {
  needleGroupRef: React.RefObject<SVGGElement | null>;
  visibleTrackCount: number;
}

/**
 * Calque `<svg>` GPU de l'aiguille principale de la Roda (`z-[5]`, `pointer-events: none`) :
 * - Au-dessus des orbites/pastilles du `<canvas>` (`z-0`),
 * - En dessous du disque Karaoké (`z-[8]`), des signaux Mestre (`z-10`) et d'`AoVivoOverlay` (`z-20`).
 * - Zéro `shadowBlur` Canvas, uniquement des jetons CSS sémantiques Cordel.
 */
export const CircleDrumstickOverlay: React.FC<CircleDrumstickOverlayProps> = React.memo(({
  needleGroupRef,
  visibleTrackCount,
}) => {
  let maxVisibleRadius = 120;
  if (visibleTrackCount > 0) {
    maxVisibleRadius = 0;
    for (let i = 0; i < visibleTrackCount; i++) {
      const r = getTrackRadius(i, visibleTrackCount);
      if (r > maxVisibleRadius) maxVisibleRadius = r;
    }
  }
  const stickLength = maxVisibleRadius + 40;
  const shaftEnd = stickLength - 13;
  const tipCx = stickLength - 6;

  return (
    <svg
      viewBox="0 0 1200 1200"
      className="absolute inset-0 w-full h-full pointer-events-none select-none z-[5]"
      aria-hidden="true"
    >
      <g transform="translate(600, 600)">
        <g
          ref={needleGroupRef}
          style={{
            transformOrigin: '0px 0px',
            willChange: 'transform',
            transform: 'rotate(-90deg)',
          }}
        >
          {/* Ombre géométrique nette façon gravure (zéro filtre gaussien) */}
          <g transform="translate(2.2, 2.2)" opacity="0.28">
            <polygon points={`0,-4.4 ${shaftEnd},-2.5 ${shaftEnd},2.5 0,4.4`} fill="var(--cordel-ink-dark, currentColor)" />
            <ellipse cx={tipCx} cy={0} rx={8.8} ry={5.6} fill="var(--cordel-ink-dark, currentColor)" />
            <circle cx={0} cy={0} r={11.5} fill="var(--cordel-ink-dark, currentColor)" />
          </g>

          {/* Fût conique en bois */}
          <polygon
            points={`0,-4.4 ${shaftEnd},-2.5 ${shaftEnd},2.5 0,4.4`}
            fill="var(--roda-skin-wood, var(--cordel-wood))"
            stroke="var(--roda-skin-border, var(--cordel-border))"
            strokeWidth={1.8}
            strokeLinejoin="round"
          />

          {/* Filet doré longitudinal */}
          <line
            x1={12}
            y1={0}
            x2={stickLength - 16}
            y2={0}
            stroke="var(--cordel-gold)"
            strokeOpacity={0.85}
            strokeWidth={1.9}
          />

          {/* Olive dorée */}
          <ellipse
            cx={tipCx}
            cy={0}
            rx={8.8}
            ry={5.6}
            fill="var(--cordel-gold)"
            stroke="var(--roda-skin-border, var(--cordel-border))"
            strokeWidth={1.8}
          />

          {/* Pivot central */}
          <circle
            cx={0}
            cy={0}
            r={11.5}
            fill="var(--roda-skin-wood, var(--cordel-wood))"
            stroke="var(--roda-skin-border, var(--cordel-border))"
            strokeWidth={2}
          />
        </g>
      </g>
    </svg>
  );
});

CircleDrumstickOverlay.displayName = 'CircleDrumstickOverlay';
