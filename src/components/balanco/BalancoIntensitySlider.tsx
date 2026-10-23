import React from 'react';
import { Language } from '../../types';

interface BalancoIntensitySliderProps {
  swingIntensity: number | undefined;
  lang: Language;
  onChange: (val: number) => void;
}

export const BalancoIntensitySlider: React.FC<BalancoIntensitySliderProps> = ({
  swingIntensity = 100,
  lang,
  onChange,
}) => {
  return (
    <div className="flex flex-col gap-1.5 bg-[#eaddcf]/30 p-3 border border-black/15 rounded-sm">
      <div className="flex justify-between items-center">
        <span className="font-bold text-[10px] uppercase flex items-center gap-1 text-[#1a1a1a]">
          {lang === 'fr' ? 'Intensité du Balanço :' : 'Intensidade do Balanço :'}
        </span>
        <span className="font-bold text-[#8b2a1a] text-xs">{swingIntensity}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={swingIntensity}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full h-2 bg-black/15 rounded-full appearance-none cursor-pointer outline-none"
        style={{ accentColor: '#8b2a1a' }}
      />
    </div>
  );
};
