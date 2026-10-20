import React from 'react';

export const CordelWoodenPostSvg: React.FC<{ isRight?: boolean; className?: string }> = ({
  isRight = false,
  className = "w-7 sm:w-8 md:w-9 h-[380px] sm:h-[430px] md:h-[470px]"
}) => {
  const gradId = isRight ? "postWoodGradR" : "postWoodGradL";
  return (
    <svg
      className={`${className} select-none overflow-visible flex-shrink-0 drop-shadow-[3px_4px_6px_rgba(0,0,0,0.35)] ${isRight ? '-scale-x-100' : ''}`}
      preserveAspectRatio="none"
      viewBox="0 0 40 440"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7a461b" />
          <stop offset="30%" stopColor="#b58245" />
          <stop offset="70%" stopColor="#9c6c33" />
          <stop offset="100%" stopColor="#573110" />
        </linearGradient>
      </defs>
      <path d="M 8 18 L 20 4 L 32 18 L 32 438 L 8 438 Z" fill={`url(#${gradId})`} stroke="#1a1a1a" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <path d="M 8 18 L 20 4 L 20 438 L 8 438 Z" fill="#000000" fillOpacity="0.18" vectorEffect="non-scaling-stroke" />
      <path d="M 14 26 L 14 85 M 15 105 L 15 220 M 14 250 L 14 350 M 15 375 L 15 432" stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <path d="M 26 22 L 26 70 M 25 90 L 25 200 M 26 230 L 26 335 M 25 360 L 25 434" stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <ellipse cx="20" cy="55" rx="3.5" ry="6" fill="none" stroke="#1a1a1a" strokeWidth="1.3" vectorEffect="non-scaling-stroke" />
      <ellipse cx="20" cy="55" rx="1.5" ry="3" fill="#1a1a1a" vectorEffect="non-scaling-stroke" />
      <ellipse cx="21" cy="185" rx="3" ry="5.5" fill="none" stroke="#1a1a1a" strokeWidth="1.3" vectorEffect="non-scaling-stroke" />
      <ellipse cx="21" cy="185" rx="1.2" ry="2.5" fill="#1a1a1a" vectorEffect="non-scaling-stroke" />
      <ellipse cx="19" cy="315" rx="3.5" ry="6" fill="none" stroke="#1a1a1a" strokeWidth="1.3" vectorEffect="non-scaling-stroke" />
      <ellipse cx="19" cy="315" rx="1.5" ry="3" fill="#1a1a1a" vectorEffect="non-scaling-stroke" />
      <path d="M 12 90 Q 20 94 28 90" stroke="#1a1a1a" strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke" />
      <path d="M 10 145 Q 20 150 30 146" stroke="#1a1a1a" strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke" />
      <rect x="2" y="24" width="10" height="7" rx="1.5" fill="#38210c" stroke="#1a1a1a" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <circle cx="5" cy="27.5" r="1.5" fill="#eaddcf" vectorEffect="non-scaling-stroke" />
      <g id="rope-knot">
        <ellipse cx="20" cy="27" rx="16" ry="6.5" fill="#1a1a1a" vectorEffect="non-scaling-stroke" />
        <ellipse cx="20" cy="27" rx="14" ry="4.5" fill="#2c2723" stroke="#eaddcf" strokeWidth="0.8" strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />
        <ellipse cx="20" cy="32" rx="15" ry="6" fill="#1a1a1a" vectorEffect="non-scaling-stroke" />
        <ellipse cx="20" cy="32" rx="13" ry="4" fill="#2c2723" stroke="#eaddcf" strokeWidth="0.8" strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />
        <path d="M 6 33 Q 3 48 5 65" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d="M 6 33 Q 3 48 5 65" stroke="#eaddcf" strokeWidth="0.9" fill="none" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
};

export const CordelCatenaryRopeSvg: React.FC<{ sag?: number; className?: string }> = ({
  sag = 20,
  className = "w-full h-8 sm:h-10"
}) => {
  const pathD = `M 0 6 Q 500 ${6 + sag} 1000 6`;
  return (
    <svg className={`${className} select-none overflow-visible block`} preserveAspectRatio="none" viewBox={`0 0 1000 ${14 + sag}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="ropeDropShadow" x="-5%" y="-30%" width="110%" height="220%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.4" />
        </filter>
      </defs>
      <path d={pathD} fill="none" stroke="#000000" strokeWidth="8" strokeOpacity="0.25" strokeLinecap="round" />
      <path d={pathD} fill="none" stroke="#1a1a1a" strokeWidth="5.5" strokeLinecap="round" filter="url(#ropeDropShadow)" />
      <path d={pathD} fill="none" stroke="#eaddcf" strokeWidth="1.8" strokeOpacity="0.75" strokeDasharray="4 4.5" strokeLinecap="round" />
      <path d={pathD} fill="none" stroke="#3c342f" strokeWidth="1" strokeDasharray="2 3" />
    </svg>
  );
};

export const PernambucoEstandarteWithMast: React.FC = () => (
  <svg className="w-18 sm:w-22 md:w-28 lg:w-32 h-auto overflow-visible select-none" viewBox="0 0 200 205" xmlns="http://www.w3.org/2000/svg">
    <polygon points="100,2 104,14 96,14" fill="#d4af37" stroke="#1a1a1a" strokeWidth="1.2" />
    <circle cx="100" cy="14" r="3" fill="#d4af37" stroke="#1a1a1a" strokeWidth="1" />
    <line x1="100" y1="14" x2="100" y2="205" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M 40 28 L 100 14 L 160 28" fill="none" stroke="#1a1a1a" strokeWidth="1.8" />
    <line x1="24" y1="28" x2="176" y2="28" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round" />
    <line x1="38" y1="28" x2="38" y2="36" stroke="#1a1a1a" strokeWidth="1.5" />
    <line x1="100" y1="28" x2="100" y2="36" stroke="#1a1a1a" strokeWidth="1.5" />
    <line x1="162" y1="28" x2="162" y2="36" stroke="#1a1a1a" strokeWidth="1.5" />
    <g id="flag-body">
      <path d="M 32 36 L 168 36 L 168 86 L 32 86 Z" fill="#1b4965" stroke="#1a1a1a" strokeWidth="2" />
      <path d="M 32 86 L 168 86 L 168 136 L 32 136 Z" fill="#f4ecd8" stroke="#1a1a1a" strokeWidth="2" />
      <polygon points="100,41 102,46 107,46 103,49 105,54 100,51 95,54 97,49 93,46 98,46" fill="#f4a261" stroke="#1a1a1a" strokeWidth="0.6" />
      <path d="M 60 86 A 40 40 0 0 1 140 86" fill="none" stroke="#8b2a1a" strokeWidth="5.5" />
      <path d="M 64 86 A 36 36 0 0 1 136 86" fill="none" stroke="#e9c46a" strokeWidth="4" />
      <path d="M 67 86 A 33 33 0 0 1 133 86" fill="none" stroke="#2a9d8f" strokeWidth="3" />
      <circle cx="100" cy="86" r="14" fill="#e9c46a" stroke="#1a1a1a" strokeWidth="1.2" />
      <rect x="96" y="95" width="8" height="32" fill="#8b2a1a" stroke="#1a1a1a" strokeWidth="1" />
      <rect x="88" y="103" width="24" height="8" fill="#8b2a1a" stroke="#1a1a1a" strokeWidth="1" />
    </g>
  </svg>
);
