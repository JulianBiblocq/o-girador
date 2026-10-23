
import React, { useRef } from 'react';

const MandacaruIcon: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full select-none pointer-events-none">
    <path d="M 15 88 Q 50 85, 85 88" className="mandala-details" stroke="currentColor" strokeWidth="3" fill="none" />
    <path
      d="
        M 46 88 
        L 46 72 
        C 32 72, 26 65, 26 50 
        C 26 42, 32 42, 33 42 
        C 36 42, 36 48, 36 50 
        C 36 60, 40 64, 46 64 
        L 46 30 
        C 46 22, 54 22, 54 30 
        L 54 52 
        C 60 52, 64 48, 64 38 
        C 64 32, 70 32, 72 32 
        C 74 32, 74 38, 74 38 
        C 74 58, 68 62, 54 62 
        L 54 88 
        Z
      "
      className="mandala-bg"
    />
    <path d="M 50 26 L 50 86" className="mandala-details" strokeDasharray="3 3" />
    <path d="M 31 43 C 31 52, 33 62, 45 68" className="mandala-details" />
    <path d="M 69 33 C 69 45, 68 53, 53 57" className="mandala-details" />
    <path d="M 50 18 L 50 22 M 48 20 L 52 20" className="mandala-details" />
    <path d="M 22 46 L 26 50 M 26 46 L 22 50" className="mandala-details" />
    <path d="M 28 60 L 32 64 M 32 60 L 28 64" className="mandala-details" />
    <path d="M 72 35 L 76 39 M 76 35 L 72 39" className="mandala-details" />
    <path d="M 68 47 L 72 51 M 72 47 L 68 51" className="mandala-details" />
    <path d="M 40 40 L 44 44 M 44 40 L 40 44" className="mandala-details" />
    <path d="M 60 70 L 64 74 M 64 70 L 60 74" className="mandala-details" />
  </svg>
);

interface RatingGroupProps {
  label: string;
  onChange: (rating: number) => void;
}

export const MandacaruRatingGroup: React.FC<RatingGroupProps> = ({ label, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentRatingRef = useRef<number>(0);

  const handleClick = (rating: number) => {
    currentRatingRef.current = rating;
    onChange(rating);
    const container = containerRef.current;
    if (container) {
      const mandalas = container.querySelectorAll('.xilo-mandala');
      mandalas.forEach((el) => {
        const idx = parseInt(el.getAttribute('data-index') || '0', 10);
        if (idx <= rating) {
          el.classList.add('is-active');
        } else {
          el.classList.remove('is-active');
        }
      });
    }
  };

  return (
    <div className="flex flex-col gap-1.5 my-2">
      <span className="text-xs font-bold text-[var(--cordel-border,#1a1a1a)] font-cactus tracking-wide uppercase">
        {label}
      </span>
      <div ref={containerRef} className="xilo-rating-group">
        {[5, 4, 3, 2, 1].map((num) => (
          <div
            key={num}
            data-index={num}
            onClick={() => handleClick(num)}
            className="xilo-mandala"
            title={`${num} / 5`}
          >
            <MandacaruIcon />
          </div>
        ))}
      </div>
    </div>
  );
};
