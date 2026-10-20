import React from 'react';

interface DrumTuningSvgProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  R_y: number;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}

export const DrumTuningSvg: React.FC<DrumTuningSvgProps> = ({
  svgRef,
  R_y,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) => {
  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 180"
      preserveAspectRatio="xMidYMid meet"
      style={{ touchAction: 'none' }}
      className="w-full h-[130px] touch-none cursor-grab active:cursor-grabbing overflow-visible mt-0.5"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <text x="14" y="43" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="#8b2a1a" textAnchor="end">+6</text>
      <text x="14" y="93" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="#1a1a1a" textAnchor="end">0</text>
      <text x="14" y="143" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="#666" textAnchor="end">-6</text>

      <line x1="16" y1="90" x2="84" y2="90" stroke="#1a1a1a" strokeWidth="1" strokeDasharray="2,2" opacity="0.2" />

      <path d="M 20,20 L 20,160 L 80,160 L 80,20 Z" fill="#ebdcb9" stroke="#1a1a1a" strokeWidth="2" strokeLinejoin="round" />
      <polygon points="20,160 50,50 80,160" fill="#1a1a1a" opacity="0.1" />
      <polygon points="20,20 50,130 80,20" fill="#1a1a1a" opacity="0.1" />

      <rect x="18" y="10" width="64" height="10" fill="#eaddcf" stroke="#1a1a1a" strokeWidth="2" rx="1" />
      <rect x="18" y="160" width="64" height="10" fill="#eaddcf" stroke="#1a1a1a" strokeWidth="2" rx="1" />

      <circle cx="25" cy="15" r="2.5" fill="#1a1a1a" />
      <circle cx="75" cy="15" r="2.5" fill="#1a1a1a" />
      <circle cx="50" cy="165" r="2.5" fill="#1a1a1a" />

      <path d={`M 25,15 L 42,${R_y} L 48,165`} fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinejoin="round" />
      <path d={`M 75,15 L 58,${R_y} L 52,165`} fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinejoin="round" />

      <polygon
        points={`32,${R_y - 10} 68,${R_y - 10} 62,${R_y + 10} 38,${R_y + 10}`}
        fill="#d4a373"
        stroke="#1a1a1a"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <path
        d={`M 48,${R_y - 6} L 52,${R_y - 3} L 48,${R_y} L 52,${R_y + 3} L 48,${R_y + 6}`}
        fill="none"
        stroke="#1a1a1a"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <rect x="15" y="10" width="70" height="160" fill="transparent" />
    </svg>
  );
};
