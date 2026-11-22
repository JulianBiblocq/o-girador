import React from 'react';

export const CordelWoodenPostSvg: React.FC<{ isRight?: boolean; className?: string }> = ({
  isRight = false,
  className = 'w-8 h-full',
}) => {
  const gradId = isRight ? 'postWoodGradR' : 'postWoodGradL';
  return (
    <div className={`${className} flex flex-col select-none drop-shadow-[3px_4px_6px_var(--cordel-shadow-color)] ${isRight ? '-scale-x-100' : ''}`}>
      {/* Tête de poteau à ratio fixe pour ancrer le nœud exactement sur l'axe de la corde */}
      <svg className="w-full h-14 shrink-0 overflow-visible block" viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--cordel-post-stop-1)" />
            <stop offset="30%" stopColor="var(--cordel-post-stop-2)" />
            <stop offset="70%" stopColor="var(--cordel-post-stop-3)" />
            <stop offset="100%" stopColor="var(--cordel-post-stop-4)" />
          </linearGradient>
        </defs>
        <path d="M 8 18 L 20 4 L 32 18 L 32 56 L 8 56 Z" fill={`url(#${gradId})`} stroke="var(--cordel-ink-dark)" strokeWidth="2" strokeLinejoin="round" />
        <path d="M 8 18 L 20 4 L 20 56 L 8 56 Z" fill="var(--cordel-ink-dark)" fillOpacity="0.18" />
        <rect x="2" y="24" width="10" height="7" rx="1.5" fill="var(--cordel-post-bracket)" stroke="var(--cordel-ink-dark)" strokeWidth="1.5" />
        <circle cx="5" cy="27.5" r="1.5" fill="var(--cordel-rope-fiber)" />
        <ellipse cx="20" cy="27" rx="15.5" ry="5.5" fill="var(--cordel-rope-core)" stroke="var(--cordel-ink-dark)" strokeWidth="1.6" />
        <ellipse cx="20" cy="27" rx="13.5" ry="3.6" fill="none" stroke="var(--cordel-rope-fiber)" strokeWidth="1.3" />
        <ellipse cx="20" cy="32" rx="14.5" ry="5" fill="var(--cordel-rope-core)" stroke="var(--cordel-ink-dark)" strokeWidth="1.6" />
        <ellipse cx="20" cy="32" rx="12.5" ry="3.2" fill="none" stroke="var(--cordel-rope-fiber)" strokeWidth="1.3" />
        <path d="M 6 33 Q 3 44 5 54" stroke="var(--cordel-rope-fiber)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </svg>

      {/* Fût du poteau extensible */}
      <svg className="w-full flex-1 overflow-visible block -mt-[1px]" preserveAspectRatio="none" viewBox="0 0 40 360" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="0" width="24" height="358" fill={`url(#${gradId})`} stroke="var(--cordel-ink-dark)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <rect x="8" y="0" width="12" height="358" fill="var(--cordel-ink-dark)" fillOpacity="0.18" vectorEffect="non-scaling-stroke" />
        <path d="M 14 10 L 14 95 M 15 120 L 15 235 M 14 260 L 14 350" stroke="var(--cordel-ink-dark)" strokeWidth="1.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d="M 26 18 L 26 110 M 25 140 L 25 250 M 26 280 L 26 352" stroke="var(--cordel-ink-dark)" strokeWidth="1.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <ellipse cx="20" cy="115" rx="3" ry="5.5" fill="none" stroke="var(--cordel-ink-dark)" strokeWidth="1.3" vectorEffect="non-scaling-stroke" />
        <ellipse cx="19" cy="245" rx="3.5" ry="6" fill="none" stroke="var(--cordel-ink-dark)" strokeWidth="1.3" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
};

export const CordelCatenaryRopeSvg: React.FC<{ sag?: number; className?: string }> = ({
  sag = 14,
  className = 'w-full h-8',
}) => {
  const pathD = `M 0 6 Q 500 ${6 + sag} 1000 6`;
  return (
    <svg className={`${className} select-none overflow-visible block`} preserveAspectRatio="none" viewBox={`0 0 1000 ${14 + sag}`} xmlns="http://www.w3.org/2000/svg">
      <path d={pathD} fill="none" stroke="var(--cordel-ink-dark)" strokeWidth="5.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <path d={pathD} fill="none" stroke="var(--cordel-rope-fiber)" strokeWidth="2.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

export const PernambucoEstandarteWithMast: React.FC = () => (
  <svg className="w-16 sm:w-20 md:w-24 lg:w-28 h-auto overflow-visible select-none" viewBox="0 0 200 205" xmlns="http://www.w3.org/2000/svg">
    <polygon points="100,2 104,14 96,14" fill="var(--cordel-gold)" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="100" cy="14" r="3" fill="var(--cordel-gold)" stroke="currentColor" strokeWidth="1" />
    <line x1="100" y1="14" x2="100" y2="205" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M 40 28 L 100 14 L 160 28" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <line x1="24" y1="28" x2="176" y2="28" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    <line x1="38" y1="28" x2="38" y2="36" stroke="currentColor" strokeWidth="1.5" />
    <line x1="100" y1="28" x2="100" y2="36" stroke="currentColor" strokeWidth="1.5" />
    <line x1="162" y1="28" x2="162" y2="36" stroke="currentColor" strokeWidth="1.5" />
    <g id="flag-body">
      <path d="M 32 36 L 168 36 L 168 86 L 32 86 Z" fill="var(--cordel-flag-blue)" stroke="var(--cordel-border-strong)" strokeWidth="2" />
      <path d="M 32 86 L 168 86 L 168 136 L 32 136 Z" fill="var(--cordel-paper-surface)" stroke="var(--cordel-border-strong)" strokeWidth="2" />
      <polygon points="100,41 102,46 107,46 103,49 105,54 100,51 95,54 97,49 93,46 98,46" fill="var(--cordel-flag-star)" stroke="var(--cordel-ink-dark)" strokeWidth="0.6" />
      <path d="M 60 86 A 40 40 0 0 1 140 86" fill="none" stroke="var(--cordel-wood)" strokeWidth="5.5" />
      <path d="M 64 86 A 36 36 0 0 1 136 86" fill="none" stroke="var(--cordel-flag-sun)" strokeWidth="4" />
      <path d="M 67 86 A 33 33 0 0 1 133 86" fill="none" stroke="var(--cordel-flag-green)" strokeWidth="3" />
      <circle cx="100" cy="86" r="14" fill="var(--cordel-flag-sun)" stroke="var(--cordel-ink-dark)" strokeWidth="1.2" />
      <rect x="96" y="95" width="8" height="32" fill="var(--cordel-wood)" stroke="var(--cordel-ink-dark)" strokeWidth="1" />
      <rect x="88" y="103" width="24" height="8" fill="var(--cordel-wood)" stroke="var(--cordel-ink-dark)" strokeWidth="1" />
    </g>
  </svg>
);
