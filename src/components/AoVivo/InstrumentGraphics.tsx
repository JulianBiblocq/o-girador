import React from 'react';

// --- forwardRef SVG Components ---
export const AlfaiaMacaneta = React.forwardRef<SVGSVGElement, { style?: React.CSSProperties }>((props, ref) => (
  <svg ref={ref} className="drop-shadow-[0_15px_30px_rgba(0,0,0,0.7)] origin-bottom" style={props.style} viewBox="0 0 100 800" preserveAspectRatio="xMidYMin meet">
    <rect x="25" y="45" width="50" height="755" fill="#7A3B12" rx="20" />
    <circle cx="50" cy="45" r="45" fill="#D2B48C" stroke="#5C3A21" strokeWidth="4" />
    <line x1="40" y1="90" x2="40" y2="800" stroke="#5C3A21" strokeWidth="4" strokeDasharray="30 20" opacity="0.4" />
    <line x1="60" y1="120" x2="60" y2="800" stroke="#5C3A21" strokeWidth="2" strokeDasharray="15 25" opacity="0.3" />
  </svg>
));
AlfaiaMacaneta.displayName = 'AlfaiaMacaneta';

export const AlfaiaBacalhau = React.forwardRef<SVGSVGElement, { style?: React.CSSProperties }>((props, ref) => (
  <svg ref={ref} className="drop-shadow-[0_15px_30px_rgba(0,0,0,0.7)] origin-bottom" style={props.style} viewBox="0 0 100 800" preserveAspectRatio="xMidYMin meet">
    <rect x="25" y="0" width="50" height="800" fill="#DEB887" rx="10" />
    <line x1="40" y1="0" x2="40" y2="800" stroke="#8B4513" strokeWidth="4" strokeDasharray="35 15" opacity="0.3" />
    <line x1="60" y1="20" x2="60" y2="800" stroke="#8B4513" strokeWidth="2" strokeDasharray="20 20" opacity="0.2" />
  </svg>
));
AlfaiaBacalhau.displayName = 'AlfaiaBacalhau';

export const DrumStick = React.forwardRef<SVGSVGElement, { style?: React.CSSProperties }>((props, ref) => (
  <svg ref={ref} className="drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)] origin-bottom" style={props.style} viewBox="0 0 100 800" preserveAspectRatio="xMidYMin meet">
    <rect x="35" y="20" width="30" height="780" fill="#E6C280" rx="15" />
    <rect x="55" y="20" width="10" height="780" fill="#C49B5A" rx="5" />
    <path d="M40 100 Q45 150 40 200 T45 300 T38 400 T42 500 T38 600 T45 700" stroke="#C49B5A" strokeWidth="2" fill="none" opacity="0.6" />
    <path d="M50 50 Q55 120 48 180 T52 280 T48 380 T55 480 T49 580 T52 750" stroke="#D9AE6B" strokeWidth="2" fill="none" opacity="0.5" />
    <circle cx="50" cy="20" r="20" fill="#E6C280" />
    <path d="M64 6 A 20 20 0 0 1 50 40 A 20 20 0 0 0 64 6" fill="#C49B5A" />
  </svg>
));
DrumStick.displayName = 'DrumStick';

export const TimbalHandLeft = React.forwardRef<SVGSVGElement, { style?: React.CSSProperties }>((props, ref) => (
  <svg ref={ref} className="drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)] origin-bottom" style={props.style} viewBox="0 0 200 800" preserveAspectRatio="xMidYMin meet">
    {/* Arm & Palm (Unified modern flat silhouette) */}
    <path d="M 140 800 L 125 300 C 135 240 150 200 150 180 C 150 120 120 110 100 110 C 80 110 50 120 50 180 C 50 200 65 240 75 300 Z" fill="#d6a26d" />
    
    {/* Fingers */}
    {/* Thumb (pointing inward) */}
    <path d="M 130 200 C 165 190 175 155 155 130 C 145 120 130 140 115 160 Z" fill="#d6a26d" />
    {/* Index finger */}
    <path d="M 140 120 C 145 40 125 40 125 120 Z" fill="#d6a26d" />
    {/* Middle finger */}
    <path d="M 120 110 C 125 20 105 20 105 110 Z" fill="#d6a26d" />
    {/* Ring finger */}
    <path d="M 100 110 C 105 30 85 30 85 110 Z" fill="#d6a26d" />
    {/* Little finger */}
    <path d="M 80 120 C 85 50 65 50 65 120 Z" fill="#d6a26d" />
  </svg>
));
TimbalHandLeft.displayName = 'TimbalHandLeft';

export const TimbalHandRight = React.forwardRef<SVGSVGElement, { style?: React.CSSProperties }>((props, ref) => (
  <svg ref={ref} className="drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)] origin-bottom" style={props.style} viewBox="0 0 200 800" preserveAspectRatio="xMidYMin meet">
    {/* Arm & Palm (Unified modern flat silhouette) */}
    <path d="M 60 800 L 75 300 C 65 240 50 200 50 180 C 50 120 80 110 100 110 C 120 110 150 120 150 180 C 150 200 135 240 125 300 Z" fill="#d6a26d" />
    
    {/* Fingers */}
    {/* Thumb (pointing inward) */}
    <path d="M 70 200 C 35 190 25 155 45 130 C 55 120 70 140 85 160 Z" fill="#d6a26d" />
    {/* Index finger */}
    <path d="M 60 120 C 55 40 75 40 75 120 Z" fill="#d6a26d" />
    {/* Middle finger */}
    <path d="M 80 110 C 75 20 95 20 95 110 Z" fill="#d6a26d" />
    {/* Ring finger */}
    <path d="M 100 110 C 95 30 115 30 115 110 Z" fill="#d6a26d" />
    {/* Little finger */}
    <path d="M 120 120 C 115 50 135 50 135 120 Z" fill="#d6a26d" />
  </svg>
));
TimbalHandRight.displayName = 'TimbalHandRight';

export const GongueStick = React.forwardRef<SVGSVGElement, { style?: React.CSSProperties }>((props, ref) => (
  <svg ref={ref} className="drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)] origin-bottom" style={props.style} viewBox="0 0 100 800" preserveAspectRatio="xMidYMin meet">
    <rect x="30" y="0" width="40" height="800" fill="#F8F9FA" rx="4" />
    <rect x="38" y="0" width="10" height="800" fill="#FFFFFF" rx="2" />
  </svg>
));
GongueStick.displayName = 'GongueStick';

export const MineiroStick = React.forwardRef<SVGSVGElement, { style?: React.CSSProperties }>((props, ref) => (
  <svg ref={ref} className="drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] w-full h-full" style={props.style} viewBox="0 0 600 120" preserveAspectRatio="xMidYMid meet">
    <rect x="20" y="10" width="560" height="100" fill="#B0BEC5" rx="10" />
    <rect x="20" y="30" width="560" height="20" fill="#FFFFFF" opacity="0.7" rx="5" />
    <line x1="20" y1="20" x2="580" y2="20" stroke="#78909C" strokeWidth="2" opacity="0.5" />
    <line x1="20" y1="50" x2="580" y2="50" stroke="#78909C" strokeWidth="2" opacity="0.5" />
    <line x1="20" y1="70" x2="580" y2="70" stroke="#78909C" strokeWidth="2" opacity="0.5" />
    <line x1="20" y1="90" x2="580" y2="90" stroke="#78909C" strokeWidth="2" opacity="0.5" />
    <rect x="10" y="5" width="20" height="110" fill="#455A64" rx="5" />
    <rect x="570" y="5" width="20" height="110" fill="#455A64" rx="5" />
  </svg>
));
MineiroStick.displayName = 'MineiroStick';
