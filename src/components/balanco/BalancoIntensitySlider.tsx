import React from 'react';
import { Language } from '../../types';

interface BalancoIntensitySliderProps {
  swingIntensity: number | undefined;
  lang: Language;
  onChange: (val: number) => void;
  label?: string;
  hint?: string;
  sliderTestId?: string;
}

export const BalancoIntensitySlider: React.FC<BalancoIntensitySliderProps> = ({
  swingIntensity,
  lang,
  onChange,
  label,
  hint,
  sliderTestId,
}) => {
  const safeIntensity = swingIntensity ?? 100;
  const resolvedLabel = label ?? (lang === 'fr' ? 'Intensité du Balanço :' : 'Intensidade do Balanço :');

  return (
    <div className="flex flex-col gap-1.5 bg-[var(--cordel-surface)] p-3 border border-[var(--cordel-border)] rounded-sm">
      <div className="flex justify-between items-center gap-2">
        <span className="font-bold text-[10px] uppercase flex items-center gap-1 text-[var(--cordel-text)]">
          {resolvedLabel}
        </span>
        <span className="font-mono font-bold text-[var(--cordel-accent-readable)] text-xs">
          {safeIntensity}%
        </span>
      </div>
      <input
        data-testid={sliderTestId}
        type="range"
        min="0"
        max="100"
        value={safeIntensity}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full h-2 bg-[var(--cordel-surface-muted)] rounded-full appearance-none cursor-pointer outline-none accent-[var(--cordel-wood)]"
      />
      {hint && (
        <span className="text-[10px] text-[var(--cordel-text-muted)] leading-tight">
          {hint}
        </span>
      )}
    </div>
  );
};
